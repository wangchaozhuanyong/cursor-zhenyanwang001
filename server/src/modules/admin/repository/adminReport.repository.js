const db = require('../../../config/db');
const {
  PAID_PAYMENT_SQL,
  UNPAID_PAYMENT_SQL,
  isEffectiveOrderExpr,
  reportDateExpr,
  reportMonthExpr,
} = require('../report/reportMetricDefinitions');
const { getReportExprs } = require('./adminReport.expr');
const { getProfitDailySqlParts, loadSchemaCapabilities } = require('../../../db/schemaContract');

/** 未执行 061 迁移时 analytics_events 不存在，报表需降级避免 500 */
let analyticsEventsReady;
const REQUIRED_ANALYTICS_COLUMNS = [
  'created_at',
  'event_type',
  'path',
  'page',
  'title',
  'anonymous_id',
  'session_id',
  'ip_hash',
  'device',
  'traffic_source',
  'os',
  'browser',
  'browser_language',
  'duration_ms',
  'amount',
];

async function isAnalyticsEventsReady() {
  if (analyticsEventsReady !== undefined) return analyticsEventsReady;
  try {
    await db.query('SELECT 1 FROM analytics_events LIMIT 1');
    const [columns] = await db.query('SHOW COLUMNS FROM analytics_events');
    const columnSet = new Set((columns || []).map((c) => String(c.Field || '').toLowerCase()));
    const missingColumns = REQUIRED_ANALYTICS_COLUMNS.filter((name) => !columnSet.has(name));
    if (missingColumns.length > 0) {
      console.warn(`[admin-report] analytics_events 缺少字段，流量分析已降级: ${missingColumns.join(', ')}`);
      analyticsEventsReady = false;
      return analyticsEventsReady;
    }
    analyticsEventsReady = true;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      analyticsEventsReady = false;
    } else {
      throw e;
    }
  }
  return analyticsEventsReady;
}

let searchTermsReady;
const REQUIRED_SEARCH_TERMS_COLUMNS = [
  'keyword',
  'search_count',
  'result_count',
  'last_searched_at',
  'created_at',
];

async function isSearchTermsReady() {
  if (searchTermsReady !== undefined) return searchTermsReady;
  try {
    await db.query('SELECT 1 FROM search_terms LIMIT 1');
    const [columns] = await db.query('SHOW COLUMNS FROM search_terms');
    const columnSet = new Set((columns || []).map((c) => String(c.Field || '').toLowerCase()));
    const missingColumns = REQUIRED_SEARCH_TERMS_COLUMNS.filter((name) => !columnSet.has(name));
    if (missingColumns.length > 0) {
      console.warn(`[admin-report] search_terms 缺少字段，搜索分析已降级: ${missingColumns.join(', ')}`);
      searchTermsReady = false;
      return searchTermsReady;
    }
    searchTermsReady = true;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.code === 'ER_BAD_FIELD_ERROR') {
      searchTermsReady = false;
    } else {
      throw e;
    }
  }
  return searchTermsReady;
}

let analyticsUserIdReady;
async function isAnalyticsUserIdReady() {
  if (analyticsUserIdReady !== undefined) return analyticsUserIdReady;
  if (!(await isAnalyticsEventsReady())) {
    analyticsUserIdReady = false;
    return analyticsUserIdReady;
  }
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM analytics_events');
    analyticsUserIdReady = (columns || []).some((c) => String(c.Field || '').toLowerCase() === 'user_id');
  } catch {
    analyticsUserIdReady = false;
  }
  return analyticsUserIdReady;
}

let userLoginAuditsReady;
async function isUserLoginAuditsReady() {
  if (userLoginAuditsReady !== undefined) return userLoginAuditsReady;
  try {
    await db.query('SELECT 1 FROM user_login_audits LIMIT 1');
    userLoginAuditsReady = true;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      userLoginAuditsReady = false;
    } else {
      throw e;
    }
  }
  return userLoginAuditsReady;
}

let browsingHistoryReady;
async function isBrowsingHistoryReady() {
  if (browsingHistoryReady !== undefined) return browsingHistoryReady;
  try {
    await db.query('SELECT 1 FROM browsing_history LIMIT 1');
    browsingHistoryReady = true;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      browsingHistoryReady = false;
    } else {
      throw e;
    }
  }
  return browsingHistoryReady;
}

let usersLastLoginReady;
async function isUsersLastLoginReady() {
  if (usersLastLoginReady !== undefined) return usersLastLoginReady;
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM users');
    usersLastLoginReady = (columns || []).some((c) => String(c.Field || '').toLowerCase() === 'last_login_at');
  } catch {
    usersLastLoginReady = false;
  }
  return usersLastLoginReady;
}

const REPORT_QUERY_TIMEOUT_MS = Number(process.env.ADMIN_REPORT_QUERY_TIMEOUT_MS || 8000);

function rangeWhere(fieldSql) {
  return `(${fieldSql}) BETWEEN ? AND ?`;
}

function utcRangeForKlDate(dateFrom, dateTo) {
  const start = new Date(`${dateFrom}T00:00:00+08:00`);
  const end = new Date(`${dateTo}T00:00:00+08:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    start: start.toISOString().slice(0, 19).replace('T', ' '),
    endExclusive: end.toISOString().slice(0, 19).replace('T', ' '),
  };
}

function rangeWhereExclusive(fieldSql) {
  return `${fieldSql} >= ? AND ${fieldSql} < ?`;
}

function withMaxExecutionTime(sql, timeoutMs = REPORT_QUERY_TIMEOUT_MS) {
  const ms = Number(timeoutMs);
  if (!Number.isFinite(ms) || ms <= 0) return sql;
  return sql.replace(/^\s*SELECT\b/i, `SELECT /*+ MAX_EXECUTION_TIME(${Math.trunc(ms)}) */`);
}

function buildProductScopeSql(filters = {}, { productAlias = 'p', categoryColumn = 'category_id' } = {}) {
  const clauses = [];
  const params = [];
  if (filters.category_id) {
    clauses.push(`${productAlias}.${categoryColumn} = ?`);
    params.push(filters.category_id);
  }
  if (filters.product_id) {
    clauses.push(`${productAlias}.id = ?`);
    params.push(filters.product_id);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildCategoryScopeSql(filters = {}, categoryAlias = 'c') {
  if (!filters.category_id) return { sql: '', params: [] };
  return { sql: ` AND ${categoryAlias}.id = ?`, params: [filters.category_id] };
}

function buildOrderScopeSql(filters = {}, alias = 'o') {
  const clauses = [];
  const params = [];
  if (filters.order_status) {
    clauses.push(`${alias}.status = ?`);
    params.push(filters.order_status);
  }
  if (filters.payment_status) {
    if (filters.payment_status === 'unpaid') {
      clauses.push(`(${alias}.payment_status IN (${UNPAID_PAYMENT_SQL}))`);
    } else {
      clauses.push(`${alias}.payment_status = ?`);
      params.push(filters.payment_status);
    }
  }
  if (filters.payment_method) {
    clauses.push(`${alias}.payment_method = ?`);
    params.push(filters.payment_method);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
    params,
  };
}

function salesPeriodExpr(granularity = 'day', alias = 'o') {
  if (granularity === 'month') {
    return reportMonthExpr(alias);
  }
  if (granularity === 'week') {
    const at = `${alias}.created_at`;
    return `DATE_FORMAT(DATE_SUB(DATE_ADD(${at}, INTERVAL 8 HOUR), INTERVAL WEEKDAY(DATE_ADD(${at}, INTERVAL 8 HOUR)) DAY),'%Y-%m-%d')`;
  }
  return reportDateExpr(alias);
}

async function queryOne(sql, params = []) {
  const [[row]] = await db.query(withMaxExecutionTime(sql), params);
  return row || {};
}

async function queryList(sql, params = []) {
  const [rows] = await db.query(withMaxExecutionTime(sql), params);
  return rows || [];
}

async function selectOverviewSummary(dateFrom, dateTo) {
  const { GROSS, NET_SALES, REFUNDED } = await getReportExprs();
  return queryOne(
    `SELECT
      COALESCE(SUM(${GROSS}),0) AS gross_sales,
      COALESCE(SUM(${NET_SALES}),0) AS paid_amount,
      COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN discount_amount ELSE 0 END),0) AS discount_amount,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COUNT(*) AS order_count,
      COALESCE(SUM(${REFUNDED}),0) AS refund_amount,
      COUNT(CASE WHEN status IN ('pending') OR payment_status IN ('pending','unpaid') THEN 1 END) AS pending_orders
     FROM orders
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}`,
    [dateFrom, dateTo],
  );
}

async function selectOverviewTopProducts(dateFrom, dateTo, asc = false) {
  return queryList(
    `SELECT p.id AS product_id,p.name AS product_name,COALESCE(SUM(oi.qty),0) AS sales_qty,COALESCE(SUM(oi.qty*oi.price),0) AS sales_amount
     FROM order_items oi
     INNER JOIN orders o ON o.id=oi.order_id
     INNER JOIN products p ON p.id=oi.product_id
     WHERE o.payment_status IN (${PAID_PAYMENT_SQL})
       AND ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
     GROUP BY p.id,p.name
     ORDER BY sales_qty ${asc ? "ASC" : "DESC"}
     LIMIT 10`,
    [dateFrom, dateTo],
  );
}

async function selectSalesDaily(dateFrom, dateTo, filters = {}) {
  const {
    GROSS_O,
    REFUNDED_O,
    NET_SALES_O,
    grossProfitSumO,
    netProfitSumO,
    missingCostJoin,
    missingCostOrderCount,
  } = await getReportExprs();
  const granularity = filters.granularity || 'day';
  const periodExpr = salesPeriodExpr(granularity, 'o');
  const periodExprO2 = salesPeriodExpr(granularity, 'o2');
  const orderScope = buildOrderScopeSql(filters, 'o');
  const orderScopeO2 = buildOrderScopeSql(filters, 'o2');
  return queryList(
    `SELECT
      ${periodExpr} AS date,
      COUNT(DISTINCT o.id) AS order_count,
      COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.id END) AS paid_order_count,
      COUNT(DISTINCT CASE WHEN o.status='cancelled' THEN o.id END) AS cancelled_order_count,
      COUNT(DISTINCT CASE WHEN o.status='refunded' OR o.payment_status='refunded' THEN o.id END) AS refund_order_count,
      COALESCE(SUM(${GROSS_O}),0) AS gross_sales,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.discount_amount ELSE 0 END),0) AS discount_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.shipping_fee ELSE 0 END),0) AS shipping_fee,
      COALESCE(SUM(${REFUNDED_O}),0) AS refund_amount,
      COALESCE(SUM(${NET_SALES_O}),0) AS net_sales,
      COALESCE(MAX(items.items_sold),0) AS items_sold,
      ${grossProfitSumO} AS gross_profit_amount,
      ${netProfitSumO} AS net_profit_amount,
      ${missingCostOrderCount} AS missing_cost_order_count,
      COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.user_id END) AS paying_users
     FROM orders o
     LEFT JOIN (
       SELECT ${periodExprO2} AS date,
              SUM(CASE WHEN o2.payment_status IN (${PAID_PAYMENT_SQL}) THEN oi.qty ELSE 0 END) AS items_sold
       FROM orders o2
       LEFT JOIN order_items oi ON oi.order_id = o2.id
       WHERE ${rangeWhere("DATE(DATE_ADD(o2.created_at, INTERVAL 8 HOUR))")}${orderScopeO2.sql}
       GROUP BY ${periodExprO2}
     ) items ON items.date = ${periodExpr}
     ${missingCostJoin}
     WHERE ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}${orderScope.sql}
     GROUP BY ${periodExpr}
     ORDER BY date ASC`,
    [dateFrom, dateTo, ...orderScopeO2.params, dateFrom, dateTo, ...orderScope.params],
  );
}

async function selectSalesMonthly(dateFrom, dateTo) {
  const { GROSS, NET_SALES, REFUNDED } = await getReportExprs();
  return queryList(
    `SELECT
      DATE_FORMAT(DATE_ADD(created_at, INTERVAL 8 HOUR),'%Y-%m') AS month,
      COALESCE(SUM(${GROSS}),0) AS gross_sales,
      COALESCE(SUM(${NET_SALES}),0) AS net_sales,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COALESCE(SUM(${REFUNDED}),0) AS refund_amount,
      COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN discount_amount ELSE 0 END),0) AS discount_amount
     FROM orders
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}
     GROUP BY DATE_FORMAT(DATE_ADD(created_at, INTERVAL 8 HOUR),'%Y-%m')
     ORDER BY month ASC`,
    [dateFrom, dateTo],
  );
}

async function selectProductsAnalysis(dateFrom, dateTo, filters = {}) {
  const { loadSchemaCapabilities } = require('../../../db/schemaContract');
  const itemSchema = await loadSchemaCapabilities();
  const discountExpr = itemSchema.orderItemsDiscountAllocated ? 'oi.discount_allocated' : '0';
  const netSalesExpr = itemSchema.orderItemsNetSales
    ? 'CASE WHEN COALESCE(oi.net_sales_amount,0) > 0 THEN oi.net_sales_amount ELSE oi.subtotal END'
    : 'oi.subtotal';
  const costExpr = itemSchema.orderItemsGrossProfit ? 'oi.cost_amount' : '0';
  const grossProfitExpr = itemSchema.orderItemsGrossProfit ? 'oi.gross_profit_amount' : '0';
  const missingCostPredicate = itemSchema.orderItemsCostSnapshot
    ? "oi.cost_snapshot_source='missing'"
    : '0=1';

  const hasAnalytics = await isAnalyticsEventsReady();
  const analyticsJoin = hasAnalytics
    ? `LEFT JOIN (
        SELECT product_id,
          SUM(CASE WHEN event_type='product_view' THEN 1 ELSE 0 END) AS view_count,
          SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_cart_count,
          SUM(CASE WHEN event_type='favorite' THEN 1 ELSE 0 END) AS favorite_count
        FROM analytics_events
        WHERE ${rangeWhere('DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))')}
        GROUP BY product_id
      ) ae ON ae.product_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci`
    : `LEFT JOIN (
        SELECT CAST(NULL AS CHAR(36)) AS product_id, 0 AS view_count, 0 AS add_cart_count, 0 AS favorite_count
        LIMIT 0
      ) ae ON ae.product_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci`;

  const productScope = buildProductScopeSql(filters);
  const params = [
    ...(hasAnalytics ? [dateFrom, dateTo] : []),
    dateFrom,
    dateTo,
    ...productScope.params,
  ];

  return queryList(
    `SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.cover_image,
      c.name AS category_name,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty ELSE 0 END),0) AS sales_qty,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty*oi.price ELSE 0 END),0) AS sales_amount,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${discountExpr} ELSE 0 END),0) AS discount_amount,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${netSalesExpr} ELSE 0 END),0) AS net_sales_amount,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${costExpr} ELSE 0 END),0) AS cost_amount,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${grossProfitExpr} ELSE 0 END),0) AS gross_profit,
      CASE WHEN COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${netSalesExpr} ELSE 0 END),0) > 0
        THEN ROUND(COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${grossProfitExpr} ELSE 0 END),0) / COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${netSalesExpr} ELSE 0 END),1) * 100, 2)
        ELSE 0 END AS gross_margin,
      COUNT(DISTINCT o.id) AS order_count,
      COUNT(DISTINCT o.user_id) AS buyer_count,
      0 AS refund_qty,
      0 AS refund_amount,
      0 AS refund_rate,
      p.stock AS current_stock,
      COALESCE(inv.inventory_cost_value,0) AS inventory_cost_value,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL AND ${missingCostPredicate} THEN 1 ELSE 0 END),0) AS missing_cost_item_count,
      NULL AS available_stock_days,
      COALESCE(MAX(ae.view_count),0) AS view_count,
      COALESCE(MAX(ae.add_cart_count),0) AS add_cart_count,
      COALESCE(MAX(ae.favorite_count),0) AS favorite_count,
      CASE WHEN COALESCE(MAX(ae.view_count),0) > 0 THEN ROUND(COUNT(DISTINCT o.id) / COALESCE(MAX(ae.view_count),1), 4) ELSE 0 END AS conversion_rate
     FROM products p
     LEFT JOIN categories c ON c.id COLLATE utf8mb4_unicode_ci = p.category_id COLLATE utf8mb4_unicode_ci
     LEFT JOIN order_items oi ON oi.product_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci
     LEFT JOIN orders o ON o.id COLLATE utf8mb4_unicode_ci = oi.order_id COLLATE utf8mb4_unicode_ci
       AND o.payment_status IN (${PAID_PAYMENT_SQL})
       AND ${rangeWhere('DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))')}
     LEFT JOIN (
       SELECT product_id,
              SUM(stock * COALESCE(cost_price,0)) AS inventory_cost_value
       FROM product_variants
       WHERE deleted_at IS NULL
       GROUP BY product_id
     ) inv ON inv.product_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci
     ${analyticsJoin}
     WHERE p.deleted_at IS NULL${productScope.sql}
     GROUP BY p.id,p.name,p.cover_image,c.name,p.stock,inv.inventory_cost_value
     ORDER BY sales_amount DESC
     LIMIT 200`,
    params,
  );
}

const PROFIT_REPORT_SELECT = `
       COALESCE(o.paid_order_count,0) AS paid_order_count,
       COALESCE(o.paid_amount,0) AS paid_amount,
       COALESCE(o.product_sales_amount,0) AS product_sales_amount,
       COALESCE(o.discount_amount,0) AS discount_amount,
       COALESCE(o.points_discount_amount,0) AS points_discount_amount,
       COALESCE(o.reward_cash_discount_amount,0) AS reward_cash_discount_amount,
       COALESCE(o.net_goods_sales_amount,0) AS net_goods_sales_amount,
       COALESCE(o.goods_cost_amount,0) AS goods_cost_amount,
       COALESCE(o.gross_profit_amount,0) AS gross_profit_amount,
       CASE WHEN COALESCE(o.net_goods_sales_amount,0) > 0 THEN ROUND(o.gross_profit_amount / o.net_goods_sales_amount * 100, 2) ELSE 0 END AS gross_margin,
       COALESCE(o.shipping_income,0) AS shipping_income,
       COALESCE(o.shipping_cost_amount,0) AS shipping_cost_amount,
       COALESCE(o.payment_fee_amount,0) AS payment_fee_amount,
       COALESCE(o.refund_amount,0) AS refund_amount,
       COALESCE(e.expense_amount,0) AS expense_amount,
       ROUND(COALESCE(o.gross_profit_amount,0) + COALESCE(o.shipping_income,0) - COALESCE(o.shipping_cost_amount,0) - COALESCE(o.payment_fee_amount,0) - COALESCE(e.expense_amount,0) - COALESCE(o.refund_amount,0), 2) AS net_profit_amount,
       CASE WHEN COALESCE(o.paid_amount,0) > 0 THEN ROUND((COALESCE(o.gross_profit_amount,0) + COALESCE(o.shipping_income,0) - COALESCE(o.shipping_cost_amount,0) - COALESCE(o.payment_fee_amount,0) - COALESCE(e.expense_amount,0) - COALESCE(o.refund_amount,0)) / o.paid_amount * 100, 2) ELSE 0 END AS net_margin,
       COALESCE(o.missing_cost_order_count,0) AS missing_cost_order_count,
       COALESCE(o.missing_cost_item_count,0) AS missing_cost_item_count`;

async function selectProfitDaily(dateFrom, dateTo) {
  const { missingCostJoin, orderAggSelect, expenseDateUnion, expenseJoin } = await getProfitDailySqlParts();
  const params = [dateFrom, dateTo];
  if (expenseDateUnion) params.push(dateFrom, dateTo);
  params.push(dateFrom, dateTo);
  if (expenseJoin.includes('operating_expense_records')) params.push(dateFrom, dateTo);

  return queryList(
    `SELECT
       d.date,
       ${PROFIT_REPORT_SELECT}
     FROM (
       SELECT DISTINCT DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) AS date
       FROM orders
       WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}
       ${expenseDateUnion}
     ) d
     LEFT JOIN (
       SELECT DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR)) AS date,
              ${orderAggSelect}
       FROM orders o
       ${missingCostJoin}
       WHERE ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
       GROUP BY DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))
     ) o ON o.date = d.date
     ${expenseJoin}
     ORDER BY d.date ASC`,
    params,
  );
}

async function selectProfitMonthly(dateFrom, dateTo) {
  const { missingCostJoin, orderAggSelect, expenseDateUnion, expenseJoin } = await getProfitDailySqlParts();
  const orderMonthExpr = "DATE_FORMAT(DATE_ADD(o.created_at, INTERVAL 8 HOUR),'%Y-%m')";
  const expenseMonthUnion = expenseDateUnion
    ? `UNION
       SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month
       FROM operating_expense_records
       WHERE expense_date BETWEEN ? AND ?`
    : '';
  const expenseMonthJoin = expenseJoin.includes('operating_expense_records')
    ? `LEFT JOIN (
       SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month, SUM(amount) AS expense_amount
       FROM operating_expense_records
       WHERE expense_date BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
     ) e ON e.month = d.month`
    : `LEFT JOIN (
       SELECT CAST(NULL AS CHAR(7)) AS month, 0 AS expense_amount
       LIMIT 0
     ) e ON e.month = d.month`;

  const params = [dateFrom, dateTo];
  if (expenseMonthUnion) params.push(dateFrom, dateTo);
  params.push(dateFrom, dateTo);
  if (expenseJoin.includes('operating_expense_records')) params.push(dateFrom, dateTo);

  return queryList(
    `SELECT
       d.month,
       ${PROFIT_REPORT_SELECT}
     FROM (
       SELECT DISTINCT DATE_FORMAT(DATE_ADD(created_at, INTERVAL 8 HOUR),'%Y-%m') AS month
       FROM orders
       WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}
       ${expenseMonthUnion}
     ) d
     LEFT JOIN (
       SELECT ${orderMonthExpr} AS month,
              ${orderAggSelect}
       FROM orders o
       ${missingCostJoin}
       WHERE ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
       GROUP BY ${orderMonthExpr}
     ) o ON o.month = d.month
     ${expenseMonthJoin}
     ORDER BY d.month ASC`,
    params,
  );
}

async function selectOperatingExpenses(dateFrom, dateTo, category = '') {
  const params = [dateFrom, dateTo];
  let categoryWhere = '';
  if (category) {
    categoryWhere = ' AND category = ?';
    params.push(category);
  }
  return queryList(
    `SELECT id, expense_date, category, amount, title, remark, operator_id, created_at, updated_at
     FROM operating_expense_records
     WHERE expense_date BETWEEN ? AND ?${categoryWhere}
     ORDER BY expense_date DESC, created_at DESC`,
    params,
  );
}

async function insertOperatingExpense(row) {
  await db.query(
    `INSERT INTO operating_expense_records
       (id, expense_date, category, amount, title, remark, operator_id)
     VALUES (?,?,?,?,?,?,?)`,
    [row.id, row.expense_date, row.category, row.amount, row.title, row.remark, row.operator_id || null],
  );
  return queryOne('SELECT * FROM operating_expense_records WHERE id = ?', [row.id]);
}

async function selectOperatingExpenseById(id) {
  return queryOne('SELECT * FROM operating_expense_records WHERE id = ?', [id]);
}

async function updateOperatingExpense(id, row) {
  await db.query(
    `UPDATE operating_expense_records
     SET expense_date = ?, category = ?, amount = ?, title = ?, remark = ?
     WHERE id = ?`,
    [row.expense_date, row.category, row.amount, row.title, row.remark, id],
  );
  return queryOne('SELECT * FROM operating_expense_records WHERE id = ?', [id]);
}

async function deleteOperatingExpense(id) {
  await db.query('DELETE FROM operating_expense_records WHERE id = ?', [id]);
}

async function selectSimpleCategoryAnalysis(dateFrom, dateTo, filters = {}) {
  const { loadSchemaCapabilities } = require('../../../db/schemaContract');
  const itemSchema = await loadSchemaCapabilities();
  const netSalesExpr = itemSchema.orderItemsNetSales
    ? 'CASE WHEN COALESCE(oi.net_sales_amount,0) > 0 THEN oi.net_sales_amount ELSE oi.subtotal END'
    : 'oi.subtotal';
  const grossProfitExpr = itemSchema.orderItemsGrossProfit ? 'oi.gross_profit_amount' : '0';
  const paidOrderJoin = `${isEffectiveOrderExpr('o')}
       AND ${rangeWhere('DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))')}`;
  const categoryScope = buildCategoryScopeSql(filters);

  return queryList(
    `SELECT c.id AS category_id,
      c.name AS category_name,
      c.parent_id AS parent_category_id,
      pc.name AS parent_category_name,
      CASE
        WHEN pc.name IS NOT NULL AND TRIM(pc.name) <> '' THEN CONCAT(pc.name, ' / ', c.name)
        ELSE c.name
      END AS category_path,
      COUNT(DISTINCT p.id) AS product_count,
      COUNT(DISTINCT CASE WHEN p.lifecycle_status=1 THEN p.id END) AS active_product_count,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty ELSE 0 END),0) AS sales_qty,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty*oi.price ELSE 0 END),0) AS sales_amount,
      COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN o.id END) AS paid_order_count,
      COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN o.user_id END) AS buyer_count,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${grossProfitExpr} ELSE 0 END),0) AS gross_profit_amount,
      CASE WHEN COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${netSalesExpr} ELSE 0 END),0) > 0
        THEN ROUND(
          COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${grossProfitExpr} ELSE 0 END),0)
          / COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN ${netSalesExpr} ELSE 0 END),1) * 100,
          2
        )
        ELSE 0 END AS gross_margin,
      COALESCE(SUM(p.stock),0) AS stock_qty
     FROM categories c
     LEFT JOIN categories pc ON pc.id COLLATE utf8mb4_unicode_ci = c.parent_id COLLATE utf8mb4_unicode_ci
       AND (pc.deleted_at IS NULL)
     LEFT JOIN products p ON p.category_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
       AND (p.deleted_at IS NULL)
     LEFT JOIN order_items oi ON oi.product_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci
     LEFT JOIN orders o ON o.id COLLATE utf8mb4_unicode_ci = oi.order_id COLLATE utf8mb4_unicode_ci
       AND ${paidOrderJoin}
     WHERE c.deleted_at IS NULL${categoryScope.sql}
     GROUP BY c.id, c.name, c.parent_id, pc.name
     ORDER BY sales_amount DESC`,
    [dateFrom, dateTo, ...categoryScope.params],
  );
}

async function selectSimpleOrderAnalysis(dateFrom, dateTo, filters = {}) {
  const { NET_SALES, REFUNDED } = await getReportExprs();
  const orderScope = buildOrderScopeSql(filters);
  return queryOne(
    `SELECT
      COUNT(*) AS order_count,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COUNT(CASE WHEN payment_status IN (${UNPAID_PAYMENT_SQL}) THEN 1 END) AS unpaid_order_count,
      COUNT(CASE WHEN status='cancelled' THEN 1 END) AS cancelled_order_count,
      COUNT(CASE WHEN status='refunded' OR payment_status='refunded' THEN 1 END) AS refund_order_count,
      COALESCE(SUM(${NET_SALES}),0) AS paid_amount,
      COALESCE(SUM(${REFUNDED}),0) AS refund_amount,
      COALESCE(AVG(total_amount),0) AS average_order_value
     FROM orders
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}${orderScope.sql}`,
    [dateFrom, dateTo, ...orderScope.params],
  );
}

async function selectOrderAnalysisDaily(dateFrom, dateTo, filters = {}) {
  const { NET_SALES, REFUNDED } = await getReportExprs();
  const orderScope = buildOrderScopeSql(filters);
  return queryList(
    `SELECT
      DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) AS date,
      COUNT(*) AS order_count,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COUNT(CASE WHEN payment_status IN (${UNPAID_PAYMENT_SQL}) THEN 1 END) AS unpaid_order_count,
      COUNT(CASE WHEN status='cancelled' THEN 1 END) AS cancelled_order_count,
      COUNT(CASE WHEN status='refunded' OR payment_status='refunded' THEN 1 END) AS refund_order_count,
      COALESCE(SUM(${NET_SALES}),0) AS paid_amount,
      COALESCE(SUM(${REFUNDED}),0) AS refund_amount
     FROM orders
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}${orderScope.sql}
     GROUP BY DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))
     ORDER BY date ASC`,
    [dateFrom, dateTo, ...orderScope.params],
  );
}

async function selectSimpleCustomerAnalysis(dateFrom, dateTo) {
  const { NET_SALES } = await getReportExprs();
  const orderDateRange = rangeWhere('DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))');
  const unionUserId = (expr) => `CAST(${expr} AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci`;

  const orderStats = await queryOne(
    `SELECT
      COUNT(DISTINCT user_id) AS order_users,
      COUNT(DISTINCT CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN user_id END) AS paying_users,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COALESCE(SUM(${NET_SALES}), 0) AS total_paid_amount
     FROM orders
     WHERE ${orderDateRange}`,
    [dateFrom, dateTo],
  );

  const repeatStats = await queryOne(
    `SELECT COUNT(*) AS repeat_buyer_count
     FROM (
       SELECT user_id
       FROM orders
       WHERE ${isEffectiveOrderExpr('')}
         AND ${orderDateRange}
       GROUP BY user_id
       HAVING COUNT(*) >= 2
     ) repeat_buyers`,
    [dateFrom, dateTo],
  );

  const newStats = await queryOne(
    `SELECT COUNT(*) AS new_users
     FROM users
     WHERE ${rangeWhere('DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))')}`,
    [dateFrom, dateTo],
  );

  const behaviorUnionParts = [];
  const behaviorParams = [];
  if (await isAnalyticsUserIdReady()) {
    behaviorUnionParts.push(
      `SELECT ${unionUserId('user_id')} AS user_id FROM analytics_events
       WHERE user_id IS NOT NULL AND user_id <> ''
         AND ${rangeWhere('DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))')}`,
    );
    behaviorParams.push(dateFrom, dateTo);
  }
  if (await isUserLoginAuditsReady()) {
    behaviorUnionParts.push(
      `SELECT ${unionUserId('user_id')} AS user_id FROM user_login_audits
       WHERE ${rangeWhere('DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))')}`,
    );
    behaviorParams.push(dateFrom, dateTo);
  }
  if (await isBrowsingHistoryReady()) {
    behaviorUnionParts.push(
      `SELECT ${unionUserId('user_id')} AS user_id FROM browsing_history
       WHERE ${rangeWhere('DATE(DATE_ADD(viewed_at, INTERVAL 8 HOUR))')}`,
    );
    behaviorParams.push(dateFrom, dateTo);
  }
  if (await isUsersLastLoginReady()) {
    behaviorUnionParts.push(
      `SELECT ${unionUserId('id')} AS user_id FROM users
       WHERE last_login_at IS NOT NULL
         AND ${rangeWhere('DATE(DATE_ADD(last_login_at, INTERVAL 8 HOUR))')}`,
    );
    behaviorParams.push(dateFrom, dateTo);
  }

  let active_users = null;
  if (behaviorUnionParts.length > 0) {
    behaviorUnionParts.push(
      `SELECT ${unionUserId('user_id')} AS user_id FROM orders WHERE ${orderDateRange}`,
    );
    behaviorParams.push(dateFrom, dateTo);

    const activeRow = await queryOne(
      `SELECT COUNT(DISTINCT user_id) AS active_users
       FROM (${behaviorUnionParts.join(' UNION ')}) engaged_users`,
      behaviorParams,
    );
    active_users = Number(activeRow.active_users || 0);
  }

  return {
    new_users: Number(newStats.new_users || 0),
    order_users: Number(orderStats.order_users || 0),
    paying_users: Number(orderStats.paying_users || 0),
    paid_order_count: Number(orderStats.paid_order_count || 0),
    total_paid_amount: Number(orderStats.total_paid_amount || 0),
    repeat_buyer_count: Number(repeatStats.repeat_buyer_count || 0),
    ...(active_users != null ? { active_users } : {}),
  };
}

/** order_items.activity_id 未迁移时无法做活动销售归因 */
let orderItemsActivitySnapshotReady;
async function isOrderItemsActivitySnapshotReady() {
  if (orderItemsActivitySnapshotReady !== undefined) return orderItemsActivitySnapshotReady;
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM order_items');
    const columnSet = new Set((columns || []).map((c) => String(c.Field || '').toLowerCase()));
    orderItemsActivitySnapshotReady = columnSet.has('activity_id');
  } catch {
    orderItemsActivitySnapshotReady = false;
  }
  return orderItemsActivitySnapshotReady;
}

async function selectSimpleActivitiesAnalysis(dateFrom, dateTo, filters = {}) {
  const salesTrackingAvailable = await isOrderItemsActivitySnapshotReady();
  const activityScope = filters.activity_id
    ? { sql: ' AND a.id = ?', params: [filters.activity_id] }
    : { sql: '', params: [] };
  if (!salesTrackingAvailable) {
    return queryList(
      `SELECT
        a.id AS activity_id,
        a.title AS activity_title,
        a.type AS activity_type,
        a.start_at,
        a.end_at,
        COUNT(DISTINCT ap.product_id) AS product_count
       FROM marketing_activities a
       LEFT JOIN marketing_activity_products ap ON ap.activity_id = a.id
       WHERE a.deleted_at IS NULL
         AND a.type NOT IN ('coupon_activity', 'new_user_gift')${activityScope.sql}
       GROUP BY a.id, a.title, a.type, a.start_at, a.end_at, a.created_at
       ORDER BY a.created_at DESC
       LIMIT 100`,
      activityScope.params,
    );
  }

  const { loadSchemaCapabilities } = require('../../../db/schemaContract');
  const itemSchema = await loadSchemaCapabilities();
  const salesAmountExpr = itemSchema.orderItemsNetSales
    ? 'CASE WHEN COALESCE(oi.net_sales_amount, 0) > 0 THEN oi.net_sales_amount ELSE oi.subtotal END'
    : 'oi.subtotal';
  const discountExpr = itemSchema.orderItemsDiscountAllocated ? 'oi.discount_allocated' : '0';
  const grossProfitExpr = itemSchema.orderItemsGrossProfit ? 'oi.gross_profit_amount' : '0';
  const hasAnalytics = await isAnalyticsEventsReady();
  const analyticsJoin = hasAnalytics
    ? `LEFT JOIN (
        SELECT activity_id,
          SUM(CASE WHEN event_type IN ('product_view', 'page_view') THEN 1 ELSE 0 END) AS view_count
        FROM analytics_events
        WHERE activity_id IS NOT NULL AND TRIM(activity_id) <> ''
          AND ${rangeWhere('DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))')}
        GROUP BY activity_id
      ) ae ON BINARY ae.activity_id = BINARY a.id`
    : `LEFT JOIN (
        SELECT CAST(NULL AS CHAR(36)) AS activity_id, 0 AS view_count
        LIMIT 0
      ) ae ON BINARY ae.activity_id = BINARY a.id`;
  const params = [
    dateFrom,
    dateTo,
    ...(hasAnalytics ? [dateFrom, dateTo] : []),
    ...activityScope.params,
  ];

  return queryList(
    `SELECT
      a.id AS activity_id,
      a.title AS activity_title,
      a.type AS activity_type,
      a.start_at,
      a.end_at,
      COUNT(DISTINCT ap.product_id) AS product_count,
      COALESCE(MAX(sales.paid_order_count), 0) AS paid_order_count,
      COALESCE(MAX(sales.sales_qty), 0) AS sales_qty,
      COALESCE(MAX(sales.sales_amount), 0) AS sales_amount,
      COALESCE(MAX(sales.discount_amount), 0) AS discount_amount,
      COALESCE(MAX(sales.gross_profit_amount), 0) AS gross_profit_amount,
      COALESCE(MAX(ae.view_count), 0) AS view_count,
      CASE
        WHEN COALESCE(MAX(ae.view_count), 0) > 0
          THEN ROUND(COALESCE(MAX(sales.paid_order_count), 0) / MAX(ae.view_count), 4)
        ELSE NULL
      END AS conversion_rate
     FROM marketing_activities a
     LEFT JOIN marketing_activity_products ap ON ap.activity_id = a.id
     LEFT JOIN (
       SELECT
         oi.activity_id,
         COUNT(DISTINCT o.id) AS paid_order_count,
         COALESCE(SUM(oi.qty), 0) AS sales_qty,
         COALESCE(SUM(${salesAmountExpr}), 0) AS sales_amount,
         COALESCE(SUM(${discountExpr}), 0) AS discount_amount,
         COALESCE(SUM(${grossProfitExpr}), 0) AS gross_profit_amount
       FROM order_items oi
       INNER JOIN orders o ON BINARY o.id = BINARY oi.order_id
       WHERE oi.activity_id IS NOT NULL
         AND TRIM(oi.activity_id) <> ''
         AND ${isEffectiveOrderExpr('o')}
         AND ${rangeWhere('DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))')}
       GROUP BY oi.activity_id
     ) sales ON BINARY sales.activity_id = BINARY a.id
     ${analyticsJoin}
     WHERE a.deleted_at IS NULL
       AND a.type NOT IN ('coupon_activity', 'new_user_gift')${activityScope.sql}
     GROUP BY a.id, a.title, a.type, a.start_at, a.end_at, a.created_at
     ORDER BY COALESCE(MAX(sales.sales_amount), 0) DESC, a.created_at DESC
     LIMIT 100`,
    params,
  );
}

async function selectCouponsAnalysis(dateFrom, dateTo, filters = {}) {
  const { GROSS_O, NET_SALES_O, schema } = await getReportExprs();
  const grossProfitOrderExpr = schema.ordersGrossProfit
    ? `CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN COALESCE(o.gross_profit_amount, 0) ELSE 0 END`
    : '0';
  const couponScope = filters.coupon_id
    ? { sql: ' AND c.id = ?', params: [filters.coupon_id] }
    : { sql: '', params: [] };
  const campaignScope = filters.coupon_campaign_id
    ? { sql: ' AND base.campaign_id = ?', params: [filters.coupon_campaign_id] }
    : { sql: '', params: [] };

  return queryList(
    `SELECT
      c.id AS coupon_id,
      c.title AS coupon_title,
      base.campaign_id AS coupon_campaign_id,
      cc.title AS coupon_campaign_title,
      cc.campaign_type AS coupon_campaign_type,
      COALESCE(c.total_quantity, 0) AS issued_count,
      COALESCE(ucs.claimed_count, 0) AS claimed_count,
      COALESCE(ucs.used_count, 0) AS used_count,
      COALESCE(ucs.expired_count, 0) AS expired_count,
      COALESCE(ord.paid_order_count, 0) AS paid_order_count,
      COALESCE(ord.sales_amount, 0) AS sales_amount,
      COALESCE(ord.discount_amount, 0) AS discount_amount,
      COALESCE(ord.net_sales, 0) AS net_sales,
      COALESCE(ord.gross_profit_amount, 0) AS gross_profit_amount
     FROM (
       SELECT DISTINCT uc.coupon_id, NULLIF(TRIM(uc.issue_activity_id), '') AS campaign_id
         FROM user_coupons uc
        WHERE uc.coupon_id IS NOT NULL
       UNION
       SELECT DISTINCT c0.id AS coupon_id, NULL AS campaign_id
         FROM coupons c0
     ) base
     INNER JOIN coupons c ON BINARY c.id = BINARY base.coupon_id
     LEFT JOIN coupon_campaigns cc ON BINARY cc.id = BINARY base.campaign_id AND cc.deleted_at IS NULL
     LEFT JOIN (
       SELECT
         uc.coupon_id,
         NULLIF(TRIM(uc.issue_activity_id), '') AS campaign_id,
         SUM(CASE
           WHEN uc.claimed_at IS NOT NULL
             AND ${rangeWhere('DATE(DATE_ADD(uc.claimed_at, INTERVAL 8 HOUR))')}
           THEN 1 ELSE 0 END) AS claimed_count,
         SUM(CASE
           WHEN uc.status = 'used'
             AND uc.used_at IS NOT NULL
             AND ${rangeWhere('DATE(DATE_ADD(uc.used_at, INTERVAL 8 HOUR))')}
           THEN 1 ELSE 0 END) AS used_count,
         SUM(CASE
           WHEN uc.status = 'used' THEN 0
           WHEN uc.status = 'expired'
             AND ${rangeWhere('DATE(DATE_ADD(c2.end_date, INTERVAL 8 HOUR))')}
           THEN 1
           WHEN uc.status NOT IN ('used', 'expired')
             AND ${rangeWhere('DATE(DATE_ADD(c2.end_date, INTERVAL 8 HOUR))')}
             AND TIMESTAMP(c2.end_date, '23:59:59') < NOW()
           THEN 1
           ELSE 0
         END) AS expired_count
       FROM user_coupons uc
       INNER JOIN coupons c2 ON BINARY c2.id = BINARY uc.coupon_id
       GROUP BY uc.coupon_id, NULLIF(TRIM(uc.issue_activity_id), '')
     ) ucs ON BINARY ucs.coupon_id = BINARY base.coupon_id AND ucs.campaign_id <=> base.campaign_id
     LEFT JOIN (
       SELECT
         uc.coupon_id,
         NULLIF(TRIM(uc.issue_activity_id), '') AS campaign_id,
         COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.id END) AS paid_order_count,
         COALESCE(SUM(${GROSS_O}), 0) AS sales_amount,
         COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.discount_amount ELSE 0 END), 0) AS discount_amount,
         COALESCE(SUM(${NET_SALES_O}), 0) AS net_sales,
         COALESCE(SUM(${grossProfitOrderExpr}), 0) AS gross_profit_amount
       FROM orders o
       INNER JOIN user_coupons uc ON BINARY o.coupon_uc_id = BINARY uc.id
       WHERE o.coupon_uc_id IS NOT NULL AND TRIM(o.coupon_uc_id) <> ''
         AND ${rangeWhere('DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))')}
       GROUP BY uc.coupon_id, NULLIF(TRIM(uc.issue_activity_id), '')
     ) ord ON BINARY ord.coupon_id = BINARY base.coupon_id AND ord.campaign_id <=> base.campaign_id
     WHERE (
       COALESCE(ucs.claimed_count, 0) > 0
       OR COALESCE(ucs.used_count, 0) > 0
       OR COALESCE(ucs.expired_count, 0) > 0
       OR COALESCE(ord.paid_order_count, 0) > 0
     )${couponScope.sql}${campaignScope.sql}
     ORDER BY COALESCE(ord.sales_amount, 0) DESC,
              COALESCE(ucs.used_count, 0) DESC,
              COALESCE(ucs.claimed_count, 0) DESC,
              c.created_at DESC
     LIMIT 200`,
    [
      dateFrom, dateTo,
      dateFrom, dateTo,
      dateFrom, dateTo,
      dateFrom, dateTo,
      dateFrom, dateTo,
      ...couponScope.params,
      ...campaignScope.params,
    ],
  );
}

async function selectInventoryAnalysis() {
  const paidOrderFilter = isEffectiveOrderExpr('o');
  const salesDateExpr = 'DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))';
  const last7Start = 'DATE(DATE_SUB(DATE(DATE_ADD(NOW(), INTERVAL 8 HOUR)), INTERVAL 6 DAY))';
  const last30Start = 'DATE(DATE_SUB(DATE(DATE_ADD(NOW(), INTERVAL 8 HOUR)), INTERVAL 29 DAY))';

  return queryList(
    `SELECT
      p.id AS product_id,
      p.name AS product_name,
      COALESCE(p.stock, 0) AS current_stock,
      COALESCE(p.stock_warning_threshold, 0) AS warning_stock,
      COALESCE(sales.sales_7d, 0) AS sales_7d,
      COALESCE(sales.sales_30d, 0) AS sales_30d
     FROM products p
     LEFT JOIN (
       SELECT
         oi.product_id,
         SUM(CASE
           WHEN ${paidOrderFilter} AND ${salesDateExpr} >= ${last7Start}
           THEN oi.qty ELSE 0 END) AS sales_7d,
         SUM(CASE
           WHEN ${paidOrderFilter} AND ${salesDateExpr} >= ${last30Start}
           THEN oi.qty ELSE 0 END) AS sales_30d
       FROM order_items oi
       INNER JOIN orders o ON BINARY o.id = BINARY oi.order_id
       GROUP BY oi.product_id
     ) sales ON BINARY sales.product_id = BINARY p.id
     WHERE p.deleted_at IS NULL
     ORDER BY COALESCE(sales.sales_30d, 0) DESC, p.stock ASC
     LIMIT 500`,
  );
}

async function selectPromotionConversionReport(dateFrom, dateTo, filters = {}) {
  const hasAnalytics = await isAnalyticsEventsReady();
  const activityScope = filters.activity_id
    ? { sql: ' AND a.id = ?', params: [filters.activity_id] }
    : { sql: '', params: [] };
  const analyticsJoin = hasAnalytics
    ? `LEFT JOIN (
        SELECT activity_id,
          SUM(CASE WHEN event_type IN ('page_view','product_view') THEN 1 ELSE 0 END) AS view_count,
          SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS add_cart_count,
          COUNT(DISTINCT CASE WHEN event_type = 'order_submit' THEN order_id END) AS order_submit_count
        FROM analytics_events
        WHERE activity_id IS NOT NULL AND TRIM(activity_id) <> ''
          AND ${rangeWhere('DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))')}
        GROUP BY activity_id
      ) ae ON BINARY ae.activity_id = BINARY a.id`
    : `LEFT JOIN (
        SELECT CAST(NULL AS CHAR(36)) AS activity_id, 0 AS view_count, 0 AS add_cart_count, 0 AS order_submit_count
        LIMIT 0
      ) ae ON BINARY ae.activity_id = BINARY a.id`;
  const params = [
    dateFrom,
    dateTo,
    ...(hasAnalytics ? [dateFrom, dateTo] : []),
    ...activityScope.params,
  ];
  return queryList(
    `SELECT
      a.id AS promotion_id,
      a.title AS promotion_title,
      a.type AS promotion_type,
      a.status AS promotion_status,
      a.start_at,
      a.end_at,
      COUNT(DISTINCT ap.product_id) AS product_count,
      COALESCE(MAX(ae.view_count), 0) AS view_count,
      COALESCE(MAX(ae.add_cart_count), 0) AS add_cart_count,
      COALESCE(MAX(ae.order_submit_count), 0) AS order_submit_count,
      COALESCE(MAX(usage_stats.usage_count), 0) AS usage_count,
      COALESCE(MAX(usage_stats.locked_count), 0) AS locked_count,
      COALESCE(MAX(usage_stats.confirmed_count), 0) AS confirmed_count,
      COALESCE(MAX(usage_stats.released_count), 0) AS released_count,
      COALESCE(MAX(usage_stats.paid_order_count), 0) AS paid_order_count,
      COALESCE(MAX(usage_stats.sales_amount), 0) AS sales_amount,
      COALESCE(MAX(usage_stats.discount_amount), 0) AS discount_amount,
      CASE
        WHEN COALESCE(MAX(ae.view_count), 0) > 0
        THEN ROUND(COALESCE(MAX(usage_stats.paid_order_count), 0) / MAX(ae.view_count) * 100, 2)
        ELSE NULL
      END AS conversion_rate,
      CASE
        WHEN COALESCE(MAX(usage_stats.paid_order_count), 0) > 0
        THEN ROUND(COALESCE(MAX(usage_stats.discount_amount), 0) / MAX(usage_stats.paid_order_count), 2)
        ELSE NULL
      END AS cost_per_paid_order
     FROM marketing_activities a
     LEFT JOIN marketing_activity_products ap ON BINARY ap.activity_id = BINARY a.id
     LEFT JOIN (
       SELECT
         pu.promotion_id,
         COALESCE(SUM(pu.usage_count), 0) AS usage_count,
         SUM(CASE WHEN pu.status = 'locked' THEN 1 ELSE 0 END) AS locked_count,
         SUM(CASE WHEN pu.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
         SUM(CASE WHEN pu.status IN ('released','cancelled') THEN 1 ELSE 0 END) AS released_count,
         COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.id END) AS paid_order_count,
         COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.total_amount ELSE 0 END), 0) AS sales_amount,
         COALESCE(SUM(CASE WHEN pu.status = 'confirmed' THEN pu.discount_amount ELSE 0 END), 0) AS discount_amount
       FROM promotion_usages pu
       LEFT JOIN orders o ON BINARY o.id = BINARY pu.order_id
       WHERE ${rangeWhere('DATE(DATE_ADD(pu.created_at, INTERVAL 8 HOUR))')}
       GROUP BY pu.promotion_id
     ) usage_stats ON BINARY usage_stats.promotion_id = BINARY a.id
     ${analyticsJoin}
     WHERE a.deleted_at IS NULL${activityScope.sql}
     GROUP BY a.id, a.title, a.type, a.status, a.start_at, a.end_at, a.created_at
     HAVING usage_count > 0 OR view_count > 0 OR product_count > 0
     ORDER BY paid_order_count DESC, sales_amount DESC, a.created_at DESC
     LIMIT 200`,
    params,
  );
}

async function selectDiscountCostReport(dateFrom, dateTo, filters = {}) {
  const schema = await loadSchemaCapabilities();
  const periodExpr = salesPeriodExpr(filters.granularity || 'day', 'o');
  const activityExpr = schema.ordersActivityDiscount ? 'COALESCE(o.activity_discount_amount,0)' : '0';
  const couponExpr = schema.ordersCouponDiscount ? 'COALESCE(o.coupon_discount_amount,0)' : '0';
  const pointsExpr = schema.ordersPointsDiscount ? 'COALESCE(o.points_discount_amount,0)' : '0';
  const rewardExpr = schema.ordersRewardCashDiscount ? 'COALESCE(o.reward_cash_discount_amount,0)' : '0';
  const shippingExpr = schema.ordersShippingDiscount ? 'COALESCE(o.shipping_discount_amount,0)' : '0';
  const totalExpr = schema.ordersTotalDiscount
    ? 'COALESCE(o.total_discount_amount,0)'
    : `(${activityExpr} + ${couponExpr} + ${pointsExpr} + ${rewardExpr} + ${shippingExpr})`;
  return queryList(
    `SELECT
      ${periodExpr} AS date,
      COUNT(DISTINCT o.id) AS order_count,
      COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.id END) AS paid_order_count,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.total_amount ELSE 0 END),0) AS paid_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN ${activityExpr} ELSE 0 END),0) AS activity_discount_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN ${couponExpr} ELSE 0 END),0) AS coupon_discount_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN ${pointsExpr} ELSE 0 END),0) AS points_discount_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN ${rewardExpr} ELSE 0 END),0) AS reward_cash_discount_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN ${shippingExpr} ELSE 0 END),0) AS shipping_discount_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN ${totalExpr} ELSE 0 END),0) AS total_discount_amount
     FROM orders o
     WHERE ${rangeWhere('DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))')}
       AND o.status <> 'cancelled'
     GROUP BY ${periodExpr}
     ORDER BY date ASC
     LIMIT 400`,
    [dateFrom, dateTo],
  );
}

async function selectPaymentFailureReport(dateFrom, dateTo, filters = {}) {
  const clauses = [rangeWhere('DATE(DATE_ADD(pe.created_at, INTERVAL 8 HOUR))')];
  const params = [dateFrom, dateTo];
  if (filters.provider) {
    clauses.push('pe.provider = ?');
    params.push(filters.provider);
  }
  if (filters.channel_code) {
    clauses.push('po.channel_code = ?');
    params.push(filters.channel_code);
  }
  return queryList(
    `SELECT
      pe.provider,
      COALESCE(NULLIF(po.channel_code,''), 'unknown') AS channel_code,
      COALESCE(NULLIF(pe.failure_reason_code,''), NULLIF(pe.error_message,''), pe.processing_result, 'unknown') AS failure_reason,
      pe.event_type,
      pe.verify_status,
      pe.processing_result,
      pe.risk_level,
      pe.review_status,
      COUNT(*) AS failed_event_count,
      COUNT(DISTINCT pe.payment_order_id) AS payment_order_count,
      COUNT(DISTINCT pe.order_id) AS affected_order_count,
      COALESCE(SUM(pe.expected_amount),0) AS expected_amount,
      COALESCE(SUM(pe.actual_amount),0) AS actual_amount,
      MAX(pe.created_at) AS latest_event_at
     FROM payment_events pe
     LEFT JOIN payment_orders po ON BINARY po.id = BINARY pe.payment_order_id
     WHERE ${clauses.join(' AND ')}
       AND (
         pe.verify_status = 'failed'
         OR pe.processing_result IN ('failed','rejected')
         OR COALESCE(pe.failure_reason_code,'') <> ''
       )
     GROUP BY pe.provider, COALESCE(NULLIF(po.channel_code,''), 'unknown'),
              COALESCE(NULLIF(pe.failure_reason_code,''), NULLIF(pe.error_message,''), pe.processing_result, 'unknown'),
              pe.event_type, pe.verify_status, pe.processing_result, pe.risk_level, pe.review_status
     ORDER BY failed_event_count DESC, latest_event_at DESC
     LIMIT 200`,
    params,
  );
}

async function selectInventoryOccupancyReport() {
  return queryList(
    `SELECT
      p.id AS product_id,
      p.name AS product_name,
      v.id AS variant_id,
      COALESCE(NULLIF(v.title,''), NULLIF(v.sku_code,''), v.id) AS variant_name,
      v.sku_code,
      COALESCE(v.stock,0) AS stock,
      COALESCE(v.reserved_stock,0) AS reserved_stock,
      COALESCE(po.pending_order_locked_stock,0) AS pending_order_locked_stock,
      COALESCE(po.pending_order_count,0) AS pending_order_count,
      (COALESCE(v.reserved_stock,0) + COALESCE(po.pending_order_locked_stock,0)) AS locked_stock,
      GREATEST(COALESCE(v.stock,0) - COALESCE(v.reserved_stock,0), 0) AS available_stock,
      COALESCE(v.stock_warning_threshold, p.stock_warning_threshold, 0) AS warning_stock
     FROM product_variants v
     INNER JOIN products p ON BINARY p.id = BINARY v.product_id
     LEFT JOIN (
       SELECT
         oi.variant_id,
         COALESCE(SUM(oi.qty),0) AS pending_order_locked_stock,
         COUNT(DISTINCT oi.order_id) AS pending_order_count
       FROM order_items oi
       INNER JOIN orders o ON BINARY o.id = BINARY oi.order_id
       WHERE o.status = 'pending'
         AND COALESCE(o.payment_status, 'pending') IN (${UNPAID_PAYMENT_SQL})
         AND COALESCE(oi.line_status, 'active') = 'active'
       GROUP BY oi.variant_id
     ) po ON BINARY po.variant_id = BINARY v.id
     WHERE p.deleted_at IS NULL
       AND v.deleted_at IS NULL
       AND (
         COALESCE(v.reserved_stock,0) > 0
         OR COALESCE(po.pending_order_locked_stock,0) > 0
         OR GREATEST(COALESCE(v.stock,0) - COALESCE(v.reserved_stock,0), 0) <= COALESCE(v.stock_warning_threshold, p.stock_warning_threshold, 0)
       )
     ORDER BY locked_stock DESC, pending_order_locked_stock DESC, available_stock ASC
     LIMIT 500`,
  );
}

async function selectOrderCancelReasonReport(dateFrom, dateTo, filters = {}) {
  const scope = buildOrderScopeSql(filters, 'o');
  const dateExpr = 'DATE(DATE_ADD(COALESCE(o.cancelled_at, o.updated_at, o.created_at), INTERVAL 8 HOUR))';
  return queryList(
    `SELECT
      COALESCE(NULLIF(TRIM(o.cancel_reason), ''), '未填写原因') AS cancel_reason,
      COUNT(*) AS cancel_count,
      COUNT(DISTINCT o.user_id) AS user_count,
      COALESCE(SUM(o.total_amount),0) AS cancelled_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.total_amount ELSE 0 END),0) AS paid_cancelled_amount,
      MIN(COALESCE(o.cancelled_at, o.updated_at, o.created_at)) AS first_cancelled_at,
      MAX(COALESCE(o.cancelled_at, o.updated_at, o.created_at)) AS latest_cancelled_at
     FROM orders o
     WHERE o.status = 'cancelled'
       AND ${rangeWhere(dateExpr)}
       ${scope.sql}
     GROUP BY COALESCE(NULLIF(TRIM(o.cancel_reason), ''), '未填写原因')
     ORDER BY cancel_count DESC, cancelled_amount DESC
     LIMIT 100`,
    [dateFrom, dateTo, ...scope.params],
  );
}

function searchAnalysisOrderBy(sortBy, sortOrder, analyticsReady) {
  const direction = String(sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const sortable = new Set([
    'search_count',
    'no_result_count',
    'last_searched_at',
    ...(analyticsReady ? ['product_click_count', 'order_count', 'sales_amount'] : []),
  ]);
  const key = sortable.has(sortBy) ? sortBy : 'search_count';
  return `ORDER BY ${key} ${direction}, st.keyword ASC`;
}

async function selectSimpleSearchAnalysis(dateFrom, dateTo, filters = {}) {
  if (!(await isSearchTermsReady())) return [];
  const keyword = String(filters.keyword || '').trim();
  const termWhere = [];
  const termParams = [dateFrom, dateTo];
  if (keyword) {
    termWhere.push('st.keyword LIKE ?');
    termParams.push(`%${keyword}%`);
  }
  if (filters.no_result_only) {
    termWhere.push('st.no_result_count > 0');
  }
  const outerWhere = termWhere.length ? `WHERE ${termWhere.join(' AND ')}` : '';

  const baseTermsSql = `
     FROM (
       SELECT keyword,
         COALESCE(SUM(search_count), 0) AS search_count,
         COALESCE(SUM(CASE WHEN result_count=0 THEN search_count ELSE 0 END), 0) AS no_result_count,
         MAX(COALESCE(last_searched_at, created_at)) AS last_searched_at
       FROM search_terms
       WHERE DATE(DATE_ADD(COALESCE(last_searched_at, created_at), INTERVAL 8 HOUR)) BETWEEN ? AND ?
       GROUP BY keyword
     ) st`;

  const analyticsReady = await isAnalyticsEventsReady();
  if (!analyticsReady) {
    return queryList(
      `SELECT
        st.keyword,
        st.search_count,
        st.no_result_count,
        st.last_searched_at
       ${baseTermsSql}
       ${outerWhere}
       ${searchAnalysisOrderBy(filters.sort_by, filters.sort_order, false)}
       LIMIT 200`,
      termParams,
    );
  }

  return queryList(
    `SELECT
      st.keyword,
      st.search_count,
      0 AS user_count,
      st.no_result_count,
      st.last_searched_at,
      COALESCE(ae.product_click_count,0) AS product_click_count,
      COALESCE(ae.add_cart_count,0) AS add_cart_count,
      COALESCE(ae.order_count,0) AS order_count,
      COALESCE(ae.sales_amount,0) AS sales_amount
     ${baseTermsSql}
     LEFT JOIN (
       SELECT keyword,
         SUM(CASE WHEN event_type='product_click' THEN 1 ELSE 0 END) AS product_click_count,
         SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_cart_count,
         COUNT(DISTINCT CASE WHEN event_type='order_submit' THEN order_id END) AS order_count,
         SUM(CASE WHEN event_type='payment_success' THEN COALESCE(amount,0) ELSE 0 END) AS sales_amount
       FROM analytics_events
       WHERE DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
       GROUP BY keyword
     ) ae ON ae.keyword COLLATE utf8mb4_unicode_ci = st.keyword
     ${outerWhere}
     ${searchAnalysisOrderBy(filters.sort_by, filters.sort_order, true)}
     LIMIT 200`,
    [dateFrom, dateTo, dateFrom, dateTo, ...termParams.slice(2)],
  );
}

async function selectOverviewBehaviorSummary(dateFrom, dateTo) {
  if (!(await isAnalyticsEventsReady())) {
    return {
      product_view_count: 0,
      product_click_count: 0,
      add_to_cart_count: 0,
      favorite_count: 0,
      checkout_start_count: 0,
    };
  }
  return queryOne(
    `SELECT
      SUM(CASE WHEN event_type='product_view' THEN 1 ELSE 0 END) AS product_view_count,
      SUM(CASE WHEN event_type='product_click' THEN 1 ELSE 0 END) AS product_click_count,
      SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart_count,
      SUM(CASE WHEN event_type='favorite' THEN 1 ELSE 0 END) AS favorite_count,
      SUM(CASE WHEN event_type='checkout_start' THEN 1 ELSE 0 END) AS checkout_start_count
     FROM analytics_events
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}`,
    [dateFrom, dateTo],
  );
}

function pageTypeSql(alias = 'ae') {
  return `CASE
    WHEN ${alias}.path IN ('', '/') THEN 'home'
    WHEN ${alias}.path LIKE '/product/%' THEN 'product'
    WHEN ${alias}.path LIKE '/categories%' THEN 'category'
    WHEN ${alias}.path LIKE '/cart%' THEN 'cart'
    WHEN ${alias}.path LIKE '/checkout%' THEN 'checkout'
    WHEN ${alias}.path LIKE '/search%' THEN 'search'
    ELSE 'other'
  END`;
}

function trafficFirstSeenJoin(alias = 'ae') {
  return `LEFT JOIN (
    SELECT anonymous_id, MIN(created_at) AS first_created_at
    FROM analytics_events
    WHERE anonymous_id <> ''
    GROUP BY anonymous_id
  ) first_seen ON first_seen.anonymous_id = ${alias}.anonymous_id`;
}

function buildTrafficWhere(dateFrom, dateTo, filters = {}, alias = 'ae') {
  const range = utcRangeForKlDate(dateFrom, dateTo);
  const where = [
    `${rangeWhereExclusive(`${alias}.created_at`)}`,
    `COALESCE(NULLIF(${alias}.path,''), ${alias}.page, '') NOT LIKE '/admin%'`,
  ];
  const params = [range.start, range.endExclusive];
  if (filters.device) {
    where.push(`${alias}.device = ?`);
    params.push(filters.device);
  }
  if (filters.traffic_source) {
    where.push(`${alias}.traffic_source = ?`);
    params.push(filters.traffic_source);
  }
  if (filters.page_type) {
    where.push(`${pageTypeSql(alias)} = ?`);
    params.push(filters.page_type);
  }
  if (filters.visitor_type === 'new') {
    where.push(`NOT EXISTS (
      SELECT 1
      FROM analytics_events ae_first
      WHERE ae_first.anonymous_id = ${alias}.anonymous_id
        AND ae_first.anonymous_id <> ''
        AND ae_first.created_at < ?
      LIMIT 1
    )`);
    params.push(range.start);
  } else if (filters.visitor_type === 'returning') {
    where.push(`EXISTS (
      SELECT 1
      FROM analytics_events ae_first
      WHERE ae_first.anonymous_id = ${alias}.anonymous_id
        AND ae_first.anonymous_id <> ''
        AND ae_first.created_at < ?
      LIMIT 1
    )`);
    params.push(range.start);
  }
  return { where: where.join(' AND '), params };
}

async function selectTrafficSummary(dateFrom, dateTo, filters = {}) {
  const range = utcRangeForKlDate(dateFrom, dateTo);
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  return queryOne(
    `SELECT
      SUM(CASE WHEN ae.event_type='page_view' THEN 1 ELSE 0 END) AS pv,
      COUNT(DISTINCT NULLIF(ae.anonymous_id,'')) AS uv,
      COUNT(DISTINCT NULLIF(ae.session_id,'')) AS sessions,
      COUNT(DISTINCT NULLIF(ae.ip_hash,'')) AS unique_ip_count,
      COUNT(DISTINCT CASE
        WHEN first_seen.first_created_at >= ? AND first_seen.first_created_at < ?
        THEN NULLIF(ae.anonymous_id,'')
      END) AS new_visitors,
      COUNT(DISTINCT CASE
        WHEN first_seen.first_created_at < ?
        THEN NULLIF(ae.anonymous_id,'')
      END) AS returning_visitors,
      COALESCE(AVG(CASE WHEN ae.event_type='page_leave' THEN ae.duration_ms END),0) AS avg_duration_ms,
      SUM(CASE WHEN ae.event_type='product_view' THEN 1 ELSE 0 END) AS product_view_count,
      SUM(CASE WHEN ae.event_type='product_click' THEN 1 ELSE 0 END) AS product_click_count,
      SUM(CASE WHEN ae.event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart_count,
      SUM(CASE WHEN ae.event_type='checkout_start' THEN 1 ELSE 0 END) AS checkout_start_count,
      SUM(CASE WHEN ae.event_type='order_submit' THEN 1 ELSE 0 END) AS order_submit_count,
      SUM(CASE WHEN ae.event_type='payment_success' THEN 1 ELSE 0 END) AS payment_success_count,
      COALESCE(SUM(CASE WHEN ae.event_type='payment_success' THEN COALESCE(ae.amount,0) ELSE 0 END),0) AS paid_amount,
      COUNT(DISTINCT CASE WHEN ae.created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN NULLIF(ae.session_id,'') END) AS online_visitors
     FROM analytics_events ae
     ${trafficFirstSeenJoin('ae')}
     WHERE ${where}`,
    [range.start, range.endExclusive, range.start, ...params],
  );
}

async function selectTrafficBounce(dateFrom, dateTo, filters = {}) {
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  return queryOne(
    `SELECT
      COUNT(*) AS sessions,
      SUM(CASE WHEN page_views <= 1 THEN 1 ELSE 0 END) AS bounce_sessions
     FROM (
       SELECT session_id, SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS page_views
       FROM analytics_events ae
       WHERE ${where} AND session_id <> ''
       GROUP BY session_id
     ) x`,
    params,
  );
}

async function selectTrafficTrend(dateFrom, dateTo, filters = {}) {
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  const groupExpr = filters.granularity === 'month'
    ? `DATE_FORMAT(DATE_ADD(ae.created_at, INTERVAL 8 HOUR),'%Y-%m')`
    : filters.granularity === 'week'
      ? `DATE_FORMAT(DATE_SUB(DATE_ADD(ae.created_at, INTERVAL 8 HOUR), INTERVAL WEEKDAY(DATE_ADD(ae.created_at, INTERVAL 8 HOUR)) DAY),'%Y-%m-%d')`
      : `DATE(DATE_ADD(ae.created_at, INTERVAL 8 HOUR))`;
  return queryList(
    `SELECT
      ${groupExpr} AS date,
      SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS pv,
      COUNT(DISTINCT NULLIF(anonymous_id,'')) AS uv,
      COUNT(DISTINCT NULLIF(session_id,'')) AS sessions,
      SUM(CASE WHEN event_type='product_view' THEN 1 ELSE 0 END) AS product_views,
      SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart,
      SUM(CASE WHEN event_type='checkout_start' THEN 1 ELSE 0 END) AS checkout_start,
      SUM(CASE WHEN event_type='order_submit' THEN 1 ELSE 0 END) AS order_submit,
      SUM(CASE WHEN event_type='payment_success' THEN 1 ELSE 0 END) AS payment_success,
      COALESCE(SUM(CASE WHEN event_type='payment_success' THEN COALESCE(amount,0) ELSE 0 END),0) AS paid_amount
     FROM analytics_events ae
     WHERE ${where}
     GROUP BY ${groupExpr}
     ORDER BY date ASC`,
    params,
  );
}

async function selectTrafficFunnel(dateFrom, dateTo, filters = {}) {
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  return queryOne(
    `SELECT
      COUNT(DISTINCT CASE WHEN event_type IN ('session_start','page_view') THEN NULLIF(session_id,'') END) AS visit_count,
      SUM(CASE WHEN event_type='product_view' THEN 1 ELSE 0 END) AS product_view_count,
      SUM(CASE WHEN event_type='product_click' THEN 1 ELSE 0 END) AS product_click_count,
      SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart_count,
      SUM(CASE WHEN event_type='checkout_start' THEN 1 ELSE 0 END) AS checkout_start_count,
      SUM(CASE WHEN event_type='order_submit' THEN 1 ELSE 0 END) AS order_submit_count,
      SUM(CASE WHEN event_type='payment_success' THEN 1 ELSE 0 END) AS payment_success_count
     FROM analytics_events ae
     WHERE ${where}`,
    params,
  );
}

async function selectTrafficTopPages(dateFrom, dateTo, filters = {}) {
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  const range = utcRangeForKlDate(dateFrom, dateTo);
  return queryList(
    `SELECT
      COALESCE(NULLIF(ae.path,''), ae.page, '/') AS path,
      COALESCE(NULLIF(MAX(ae.title),''), MIN(COALESCE(NULLIF(ae.path,''), ae.page, '/'))) AS title,
      ${pageTypeSql('ae')} AS page_type,
      SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS pv,
      COUNT(DISTINCT NULLIF(anonymous_id,'')) AS uv,
      COALESCE(AVG(CASE WHEN event_type='page_leave' THEN duration_ms END),0) AS avg_duration_ms,
      CASE
        WHEN COUNT(DISTINCT CASE WHEN ae.session_id <> '' THEN ae.session_id END) > 0
        THEN ROUND(
          COUNT(DISTINCT CASE WHEN ae.session_id <> '' AND session_total_page_views <= 1 THEN ae.session_id END)
          / COUNT(DISTINCT CASE WHEN ae.session_id <> '' THEN ae.session_id END) * 100,
          2
        )
        ELSE 0
      END AS bounce_rate,
      SUM(CASE WHEN event_type='page_leave' THEN 1 ELSE 0 END) AS exit_count,
      SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart_count,
      SUM(CASE WHEN event_type='order_submit' THEN 1 ELSE 0 END) AS order_submit_count,
      COALESCE(SUM(CASE WHEN event_type='payment_success' THEN COALESCE(amount,0) ELSE 0 END),0) AS paid_amount
     FROM analytics_events ae
     LEFT JOIN (
       SELECT session_id, SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS session_total_page_views
       FROM analytics_events
       WHERE ${rangeWhereExclusive('created_at')}
         AND session_id <> ''
       GROUP BY session_id
     ) session_stats ON session_stats.session_id = ae.session_id
     WHERE ${where}
     GROUP BY COALESCE(NULLIF(ae.path,''), ae.page, '/'), ${pageTypeSql('ae')}
     ORDER BY pv DESC
     LIMIT 100`,
    [range.start, range.endExclusive, ...params],
  );
}

async function selectTrafficSources(dateFrom, dateTo, filters = {}) {
  const range = utcRangeForKlDate(dateFrom, dateTo);
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  return queryList(
    `SELECT
      COALESCE(NULLIF(ae.traffic_source,''), 'direct') AS traffic_source,
      SUM(CASE WHEN ae.event_type='page_view' THEN 1 ELSE 0 END) AS pv,
      COUNT(DISTINCT NULLIF(ae.anonymous_id,'')) AS uv,
      COUNT(DISTINCT CASE
        WHEN first_seen.first_created_at >= ? AND first_seen.first_created_at < ?
        THEN NULLIF(ae.anonymous_id,'')
      END) AS new_visitors,
      SUM(CASE WHEN ae.event_type='order_submit' THEN 1 ELSE 0 END) AS order_submit_count,
      SUM(CASE WHEN ae.event_type='payment_success' THEN 1 ELSE 0 END) AS payment_success_count,
      COALESCE(SUM(CASE WHEN ae.event_type='payment_success' THEN COALESCE(ae.amount,0) ELSE 0 END),0) AS paid_amount
     FROM analytics_events ae
     ${trafficFirstSeenJoin('ae')}
     WHERE ${where}
     GROUP BY COALESCE(NULLIF(ae.traffic_source,''), 'direct')
     ORDER BY pv DESC
     LIMIT 100`,
    [range.start, range.endExclusive, ...params],
  );
}

async function selectTrafficDevices(dateFrom, dateTo, filters = {}) {
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  return queryList(
    `SELECT
      COALESCE(NULLIF(device,''), 'unknown') AS device,
      COALESCE(NULLIF(os,''), 'unknown') AS os,
      COALESCE(NULLIF(browser,''), 'unknown') AS browser,
      COALESCE(NULLIF(browser_language,''), 'unknown') AS browser_language,
      SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS pv,
      COUNT(DISTINCT NULLIF(anonymous_id,'')) AS uv,
      COUNT(DISTINCT NULLIF(session_id,'')) AS sessions,
      SUM(CASE WHEN event_type='payment_success' THEN 1 ELSE 0 END) AS payment_success_count,
      COALESCE(SUM(CASE WHEN event_type='payment_success' THEN COALESCE(amount,0) ELSE 0 END),0) AS paid_amount
     FROM analytics_events ae
     WHERE ${where}
     GROUP BY COALESCE(NULLIF(device,''), 'unknown'), COALESCE(NULLIF(os,''), 'unknown'), COALESCE(NULLIF(browser,''), 'unknown'), COALESCE(NULLIF(browser_language,''), 'unknown')
     ORDER BY pv DESC
     LIMIT 100`,
    params,
  );
}

async function selectTrafficLastUpdated(dateFrom, dateTo, filters = {}) {
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  return queryOne(
    `SELECT MAX(created_at) AS last_updated_at
     FROM analytics_events ae
     WHERE ${where}`,
    params,
  );
}

module.exports = {
  isAnalyticsEventsReady,
  isSearchTermsReady,
  isOrderItemsActivitySnapshotReady,
  selectOverviewSummary,
  selectOverviewTopProducts,
  selectSalesDaily,
  selectSalesMonthly,
  selectProfitDaily,
  selectProfitMonthly,
  selectProductsAnalysis,
  selectSimpleCategoryAnalysis,
  selectSimpleOrderAnalysis,
  selectOrderAnalysisDaily,
  selectSimpleCustomerAnalysis,
  selectSimpleActivitiesAnalysis,
  selectPromotionConversionReport,
  selectCouponsAnalysis,
  selectDiscountCostReport,
  selectPaymentFailureReport,
  selectInventoryAnalysis,
  selectInventoryOccupancyReport,
  selectOrderCancelReasonReport,
  selectSimpleSearchAnalysis,
  selectOverviewBehaviorSummary,
  selectTrafficSummary,
  selectTrafficBounce,
  selectTrafficTrend,
  selectTrafficFunnel,
  selectTrafficTopPages,
  selectTrafficSources,
  selectTrafficDevices,
  selectTrafficLastUpdated,
  selectOperatingExpenses,
  insertOperatingExpense,
  selectOperatingExpenseById,
  updateOperatingExpense,
  deleteOperatingExpense,
};
