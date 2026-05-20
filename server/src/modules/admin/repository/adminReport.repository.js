const db = require('../../../config/db');
const { PAID_PAYMENT_SQL, netSalesExpr, refundedAmountExpr } = require('../../../utils/orderRevenueSql');

const NET_SALES_O = netSalesExpr('o');
const NET_SALES = netSalesExpr('');
const REFUNDED_O = refundedAmountExpr('o');
const REFUNDED = refundedAmountExpr('');
const GROSS_O = `CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.total_amount ELSE 0 END`;
const GROSS = `CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN total_amount ELSE 0 END`;
const ORDER_NET_RATIO = `(CASE WHEN o.total_amount > 0 AND o.payment_status IN (${PAID_PAYMENT_SQL})
  THEN GREATEST(0, o.total_amount - COALESCE(o.refunded_amount, 0)) / o.total_amount ELSE 0 END)`;

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

function rangeWhere(fieldSql) {
  return `(${fieldSql}) BETWEEN ? AND ?`;
}

async function queryOne(sql, params = []) {
  const [[row]] = await db.query(sql, params);
  return row || {};
}

async function queryList(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows || [];
}

async function selectOverviewSummary(dateFrom, dateTo) {
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

async function selectSalesDaily(dateFrom, dateTo) {
  return queryList(
    `SELECT
      DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR)) AS date,
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
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.gross_profit_amount ELSE 0 END),0) AS gross_profit_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.net_profit_amount ELSE 0 END),0) AS net_profit_amount,
      COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) AND missing.missing_cost_item_count > 0 THEN o.id END) AS missing_cost_order_count,
      COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.user_id END) AS paying_users
     FROM orders o
     LEFT JOIN (
       SELECT DATE(DATE_ADD(o2.created_at, INTERVAL 8 HOUR)) AS date,
              SUM(CASE WHEN o2.payment_status IN (${PAID_PAYMENT_SQL}) THEN oi.qty ELSE 0 END) AS items_sold
       FROM orders o2
       LEFT JOIN order_items oi ON oi.order_id = o2.id
       WHERE ${rangeWhere("DATE(DATE_ADD(o2.created_at, INTERVAL 8 HOUR))")}
       GROUP BY DATE(DATE_ADD(o2.created_at, INTERVAL 8 HOUR))
     ) items ON items.date = DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))
     LEFT JOIN (
       SELECT order_id, SUM(CASE WHEN cost_snapshot_source='missing' THEN 1 ELSE 0 END) AS missing_cost_item_count
       FROM order_items
       GROUP BY order_id
     ) missing ON missing.order_id = o.id
     WHERE ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
     GROUP BY DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))
     ORDER BY date ASC`,
    [dateFrom, dateTo, dateFrom, dateTo],
  );
}

async function selectSalesMonthly(dateFrom, dateTo) {
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

async function selectProductsAnalysis(dateFrom, dateTo) {
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

  const params = hasAnalytics ? [dateFrom, dateTo, dateFrom, dateTo] : [dateFrom, dateTo];

  return queryList(
    `SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.cover_image,
      c.name AS category_name,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty ELSE 0 END),0) AS sales_qty,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty*oi.price ELSE 0 END),0) AS sales_amount,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.discount_allocated ELSE 0 END),0) AS discount_amount,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN CASE WHEN COALESCE(oi.net_sales_amount,0) > 0 THEN oi.net_sales_amount ELSE oi.subtotal END ELSE 0 END),0) AS net_sales_amount,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.cost_amount ELSE 0 END),0) AS cost_amount,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.gross_profit_amount ELSE 0 END),0) AS gross_profit,
      CASE WHEN COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN CASE WHEN COALESCE(oi.net_sales_amount,0) > 0 THEN oi.net_sales_amount ELSE oi.subtotal END ELSE 0 END),0) > 0
        THEN ROUND(COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.gross_profit_amount ELSE 0 END),0) / COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN CASE WHEN COALESCE(oi.net_sales_amount,0) > 0 THEN oi.net_sales_amount ELSE oi.subtotal END ELSE 0 END),1) * 100, 2)
        ELSE 0 END AS gross_margin,
      COUNT(DISTINCT o.id) AS order_count,
      COUNT(DISTINCT o.user_id) AS buyer_count,
      0 AS refund_qty,
      0 AS refund_amount,
      0 AS refund_rate,
      p.stock AS current_stock,
      COALESCE(inv.inventory_cost_value,0) AS inventory_cost_value,
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL AND oi.cost_snapshot_source='missing' THEN 1 ELSE 0 END),0) AS missing_cost_item_count,
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
     WHERE p.deleted_at IS NULL
     GROUP BY p.id,p.name,p.cover_image,c.name,p.stock,inv.inventory_cost_value
     ORDER BY sales_amount DESC
     LIMIT 200`,
    params,
  );
}

async function selectProfitDaily(dateFrom, dateTo) {
  return queryList(
    `SELECT
       d.date,
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
       COALESCE(o.missing_cost_item_count,0) AS missing_cost_item_count
     FROM (
       SELECT DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) AS date
       FROM orders
       WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}
       UNION
       SELECT expense_date AS date
       FROM operating_expense_records
       WHERE expense_date BETWEEN ? AND ?
     ) d
     LEFT JOIN (
       SELECT DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR)) AS date,
              COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.id END) AS paid_order_count,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN GREATEST(0, o.total_amount - COALESCE(o.refunded_amount,0)) ELSE 0 END) AS paid_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.raw_amount ELSE 0 END) AS product_sales_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.discount_amount ELSE 0 END) AS discount_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.points_discount_amount ELSE 0 END) AS points_discount_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.reward_cash_discount_amount ELSE 0 END) AS reward_cash_discount_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.goods_net_sales_amount ELSE 0 END) AS net_goods_sales_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.goods_cost_amount ELSE 0 END) AS goods_cost_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.gross_profit_amount ELSE 0 END) AS gross_profit_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.shipping_fee ELSE 0 END) AS shipping_income,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.shipping_cost_amount ELSE 0 END) AS shipping_cost_amount,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.payment_fee_amount ELSE 0 END) AS payment_fee_amount,
              SUM(COALESCE(o.refunded_amount,0)) AS refund_amount,
              COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) AND missing.missing_cost_item_count > 0 THEN o.id END) AS missing_cost_order_count,
              SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN COALESCE(missing.missing_cost_item_count,0) ELSE 0 END) AS missing_cost_item_count
       FROM orders o
       LEFT JOIN (
         SELECT order_id, SUM(CASE WHEN cost_snapshot_source='missing' THEN 1 ELSE 0 END) AS missing_cost_item_count
         FROM order_items
         GROUP BY order_id
       ) missing ON missing.order_id = o.id
       WHERE ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
       GROUP BY DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))
     ) o ON o.date = d.date
     LEFT JOIN (
       SELECT expense_date AS date, SUM(amount) AS expense_amount
       FROM operating_expense_records
       WHERE expense_date BETWEEN ? AND ?
       GROUP BY expense_date
     ) e ON e.date = d.date
     ORDER BY d.date ASC`,
    [dateFrom, dateTo, dateFrom, dateTo, dateFrom, dateTo, dateFrom, dateTo],
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

async function selectSimpleCategoryAnalysis(dateFrom, dateTo) {
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
      COALESCE(SUM(oi.qty),0) AS sales_qty,
      COALESCE(SUM(oi.qty*oi.price),0) AS sales_amount,
      COALESCE(SUM(p.stock),0) AS stock_qty
     FROM categories c
     LEFT JOIN categories pc ON pc.id COLLATE utf8mb4_unicode_ci = c.parent_id COLLATE utf8mb4_unicode_ci
       AND (pc.deleted_at IS NULL)
     LEFT JOIN products p ON p.category_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
       AND (p.deleted_at IS NULL)
     LEFT JOIN order_items oi ON oi.product_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci
     LEFT JOIN orders o ON o.id COLLATE utf8mb4_unicode_ci = oi.order_id COLLATE utf8mb4_unicode_ci
       AND ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
     WHERE c.deleted_at IS NULL
     GROUP BY c.id, c.name, c.parent_id, pc.name
     ORDER BY sales_amount DESC`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleOrderAnalysis(dateFrom, dateTo) {
  return queryOne(
    `SELECT
      COUNT(*) AS order_count,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COUNT(CASE WHEN payment_status='unpaid' THEN 1 END) AS unpaid_order_count,
      COUNT(CASE WHEN status='cancelled' THEN 1 END) AS cancelled_order_count,
      COUNT(CASE WHEN status='refunded' OR payment_status='refunded' THEN 1 END) AS refund_order_count,
      COALESCE(AVG(total_amount),0) AS average_order_value
     FROM orders
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleCustomerAnalysis(dateFrom, dateTo) {
  return queryOne(
    `SELECT
      COUNT(DISTINCT u.id) AS active_users,
      COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN u.id END) AS order_users,
      COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN u.id END) AS paying_users,
      COUNT(DISTINCT CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN u.id END) AS new_users
     FROM users u
     LEFT JOIN orders o ON o.user_id=u.id AND ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleActivitiesAnalysis(dateFrom, dateTo) {
  return queryList(
    `SELECT
      a.id AS activity_id,
      a.title AS activity_title,
      a.type AS activity_type,
      a.start_at,
      a.end_at,
      COUNT(ap.id) AS product_count,
      0 AS sales_amount,
      0 AS order_count,
      0 AS sales_qty,
      0 AS discount_amount
     FROM marketing_activities a
     LEFT JOIN marketing_activity_products ap ON ap.activity_id = a.id
     WHERE a.deleted_at IS NULL
       AND DATE(DATE_ADD(a.created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
     GROUP BY a.id, a.title, a.type, a.start_at, a.end_at, a.created_at
     ORDER BY a.created_at DESC
     LIMIT 100`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleCouponsAnalysis(dateFrom, dateTo) {
  return queryList(
    `SELECT c.id AS coupon_id,c.title AS coupon_title,
      c.total_quantity AS issued_count,
      (SELECT COUNT(*) FROM user_coupons uc WHERE uc.coupon_id=c.id) AS claimed_count,
      (SELECT COUNT(*) FROM user_coupons uc WHERE uc.coupon_id=c.id AND uc.status='used') AS used_count,
      0 AS expired_count
     FROM coupons c
     WHERE DATE(DATE_ADD(c.created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleInventoryAnalysis() {
  return queryList(
    `SELECT p.id AS product_id,p.name AS product_name,p.stock AS current_stock,p.stock_warning_threshold AS warning_stock,
      0 AS sales_7d,0 AS sales_30d,0 AS avg_daily_sales,NULL AS available_stock_days,
      CASE WHEN p.stock <= COALESCE(p.stock_warning_threshold,0) THEN 'low' ELSE 'normal' END AS stock_status
     FROM products p
     ORDER BY p.stock ASC
     LIMIT 200`,
  );
}

async function selectSimpleSearchAnalysis(dateFrom, dateTo) {
  const baseTermsSql = `
     FROM (
       SELECT keyword,COUNT(*) AS search_count,
         SUM(CASE WHEN result_count=0 THEN 1 ELSE 0 END) AS no_result_count,
         MAX(created_at) AS last_searched_at
       FROM search_terms
       WHERE DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
       GROUP BY keyword
     ) st`;

  if (!(await isAnalyticsEventsReady())) {
    return queryList(
      `SELECT
        st.keyword,
        st.search_count,
        0 AS user_count,
        st.no_result_count,
        st.last_searched_at,
        0 AS product_click_count,
        0 AS add_cart_count,
        0 AS order_count,
        0 AS sales_amount
       ${baseTermsSql}
       ORDER BY st.search_count DESC
       LIMIT 200`,
      [dateFrom, dateTo],
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
     ORDER BY st.search_count DESC
     LIMIT 200`,
    [dateFrom, dateTo, dateFrom, dateTo],
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

function buildTrafficWhere(dateFrom, dateTo, filters = {}, alias = 'ae') {
  const where = [
    `${rangeWhere(`DATE(DATE_ADD(${alias}.created_at, INTERVAL 8 HOUR))`)}`,
    `COALESCE(NULLIF(${alias}.path,''), ${alias}.page, '') NOT LIKE '/admin%'`,
  ];
  const params = [dateFrom, dateTo];
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
    where.push(`(
      SELECT DATE(DATE_ADD(MIN(ae_first.created_at), INTERVAL 8 HOUR))
      FROM analytics_events ae_first
      WHERE ae_first.anonymous_id = ${alias}.anonymous_id AND ae_first.anonymous_id <> ''
    ) BETWEEN ? AND ?`);
    params.push(dateFrom, dateTo);
  } else if (filters.visitor_type === 'returning') {
    where.push(`(
      SELECT DATE(DATE_ADD(MIN(ae_first.created_at), INTERVAL 8 HOUR))
      FROM analytics_events ae_first
      WHERE ae_first.anonymous_id = ${alias}.anonymous_id AND ae_first.anonymous_id <> ''
    ) < ?`);
    params.push(dateFrom);
  }
  return { where: where.join(' AND '), params };
}

async function selectTrafficSummary(dateFrom, dateTo, filters = {}) {
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  return queryOne(
    `SELECT
      SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS pv,
      COUNT(DISTINCT NULLIF(anonymous_id,'')) AS uv,
      COUNT(DISTINCT NULLIF(session_id,'')) AS sessions,
      COUNT(DISTINCT NULLIF(ip_hash,'')) AS unique_ip_count,
      COUNT(DISTINCT CASE WHEN (
        SELECT DATE(DATE_ADD(MIN(ae_first.created_at), INTERVAL 8 HOUR))
        FROM analytics_events ae_first
        WHERE ae_first.anonymous_id = ae.anonymous_id AND ae_first.anonymous_id <> ''
      ) BETWEEN ? AND ? THEN NULLIF(ae.anonymous_id,'') END) AS new_visitors,
      COUNT(DISTINCT CASE WHEN (
        SELECT DATE(DATE_ADD(MIN(ae_first.created_at), INTERVAL 8 HOUR))
        FROM analytics_events ae_first
        WHERE ae_first.anonymous_id = ae.anonymous_id AND ae_first.anonymous_id <> ''
      ) < ? THEN NULLIF(ae.anonymous_id,'') END) AS returning_visitors,
      COALESCE(AVG(CASE WHEN event_type='page_leave' THEN duration_ms END),0) AS avg_duration_ms,
      SUM(CASE WHEN event_type='product_view' THEN 1 ELSE 0 END) AS product_view_count,
      SUM(CASE WHEN event_type='product_click' THEN 1 ELSE 0 END) AS product_click_count,
      SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart_count,
      SUM(CASE WHEN event_type='checkout_start' THEN 1 ELSE 0 END) AS checkout_start_count,
      SUM(CASE WHEN event_type='order_submit' THEN 1 ELSE 0 END) AS order_submit_count,
      SUM(CASE WHEN event_type='payment_success' THEN 1 ELSE 0 END) AS payment_success_count,
      COALESCE(SUM(CASE WHEN event_type='payment_success' THEN COALESCE(amount,0) ELSE 0 END),0) AS paid_amount,
      COUNT(DISTINCT CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN NULLIF(session_id,'') END) AS online_visitors
     FROM analytics_events ae
     WHERE ${where}`,
    [dateFrom, dateTo, dateFrom, ...params],
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
  return queryList(
    `SELECT
      COALESCE(NULLIF(path,''), page, '/') AS path,
      COALESCE(NULLIF(MAX(title),''), COALESCE(NULLIF(path,''), page, '/')) AS title,
      ${pageTypeSql('ae')} AS page_type,
      SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS pv,
      COUNT(DISTINCT NULLIF(anonymous_id,'')) AS uv,
      COALESCE(AVG(CASE WHEN event_type='page_leave' THEN duration_ms END),0) AS avg_duration_ms,
      CASE
        WHEN COUNT(DISTINCT CASE WHEN session_id <> '' THEN session_id END) > 0
        THEN ROUND(
          COUNT(DISTINCT CASE WHEN session_id <> '' AND session_total_page_views <= 1 THEN session_id END)
          / COUNT(DISTINCT CASE WHEN session_id <> '' THEN session_id END) * 100,
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
       WHERE DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
         AND session_id <> ''
       GROUP BY session_id
     ) session_stats ON session_stats.session_id = ae.session_id
     WHERE ${where}
     GROUP BY COALESCE(NULLIF(path,''), page, '/'), ${pageTypeSql('ae')}
     ORDER BY pv DESC
     LIMIT 100`,
    [dateFrom, dateTo, ...params],
  );
}

async function selectTrafficSources(dateFrom, dateTo, filters = {}) {
  const { where, params } = buildTrafficWhere(dateFrom, dateTo, filters);
  return queryList(
    `SELECT
      COALESCE(NULLIF(traffic_source,''), 'direct') AS traffic_source,
      SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS pv,
      COUNT(DISTINCT NULLIF(anonymous_id,'')) AS uv,
      COUNT(DISTINCT CASE WHEN (
        SELECT DATE(DATE_ADD(MIN(ae_first.created_at), INTERVAL 8 HOUR))
        FROM analytics_events ae_first
        WHERE ae_first.anonymous_id = ae.anonymous_id AND ae_first.anonymous_id <> ''
      ) BETWEEN ? AND ? THEN NULLIF(ae.anonymous_id,'') END) AS new_visitors,
      SUM(CASE WHEN event_type='order_submit' THEN 1 ELSE 0 END) AS order_submit_count,
      SUM(CASE WHEN event_type='payment_success' THEN 1 ELSE 0 END) AS payment_success_count,
      COALESCE(SUM(CASE WHEN event_type='payment_success' THEN COALESCE(amount,0) ELSE 0 END),0) AS paid_amount
     FROM analytics_events ae
     WHERE ${where}
     GROUP BY COALESCE(NULLIF(traffic_source,''), 'direct')
     ORDER BY pv DESC
     LIMIT 100`,
    [dateFrom, dateTo, ...params],
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
  selectOverviewSummary,
  selectOverviewTopProducts,
  selectSalesDaily,
  selectSalesMonthly,
  selectProfitDaily,
  selectProductsAnalysis,
  selectSimpleCategoryAnalysis,
  selectSimpleOrderAnalysis,
  selectSimpleCustomerAnalysis,
  selectSimpleActivitiesAnalysis,
  selectSimpleCouponsAnalysis,
  selectSimpleInventoryAnalysis,
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
