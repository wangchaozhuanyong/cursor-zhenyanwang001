const db = require('../../../config/db');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const {
  orderAfterSalePredicate,
  orderAfterSaleParams,
  ORDER_REFUNDING_STATUSES,
} = require('../../order/orderAfterSale');
const { klDateSql } = require('../../../utils/klDateRange');
const {
  PAID_PAYMENT_SQL,
  UNPAID_PAYMENT_SQL,
  netSalesExpr,
  refundedAmountExpr,
  orderNetRatioExpr,
} = require('../../../utils/orderRevenueSql');
const { getDashboardSchema } = require('./adminDashboard.schema');

const ORDER_KL_DATE = klDateSql('created_at');
const USER_KL_DATE = klDateSql('users.created_at');
const AE_KL_DATE = klDateSql('ae.created_at');

function rangeBetween(fieldSql) {
  return `${fieldSql} BETWEEN ? AND ?`;
}

async function getSqlContext() {
  const schema = await getDashboardSchema();
  const revenueOpts = { includeRefundedAmount: schema.ordersRefundedAmount };
  return {
    schema,
    NET_SALES: netSalesExpr('', revenueOpts),
    REFUNDED: refundedAmountExpr('', revenueOpts),
    ORDER_NET_RATIO: orderNetRatioExpr('o', revenueOpts),
    afterSale: schema.returnRequests
      ? { sql: orderAfterSalePredicate('o'), params: orderAfterSaleParams() }
      : { sql: 'o.status IN (?, ?)', params: [...ORDER_REFUNDING_STATUSES] },
    lowStockCountSql: schema.productVariants
      ? `(SELECT COUNT(DISTINCT p.id) FROM products p
          INNER JOIN product_variants v ON v.product_id = p.id AND v.deleted_at IS NULL
          WHERE p.deleted_at IS NULL AND p.status = 'active'
            AND v.stock > 0 AND v.stock <= COALESCE(v.stock_warning_threshold, 5))`
      : `(SELECT COUNT(*) FROM products p
          WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.stock > 0 AND p.stock <= 5)`,
    outOfStockCountSql: schema.productVariants
      ? `(SELECT COUNT(DISTINCT p.id) FROM products p
          INNER JOIN product_variants v ON v.product_id = p.id AND v.deleted_at IS NULL
          WHERE p.deleted_at IS NULL AND p.status = 'active' AND v.stock <= 0)`
      : `(SELECT COUNT(*) FROM products p
          WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.stock <= 0)`,
    categoryWhere: schema.categoriesDeletedAt ? 'c.deleted_at IS NULL' : 'c.is_active = 1',
  };
}

async function countOrdersExcludingCancelled() {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS totalOrders FROM orders WHERE status != '${ORDER_STATUS.CANCELLED}'`,
  );
  return row.totalOrders;
}

async function countUsers() {
  const [[row]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users WHERE deleted_at IS NULL');
  return row.totalUsers;
}

async function countProducts() {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS totalProducts FROM products WHERE deleted_at IS NULL AND status = 'active'`,
  );
  return row.totalProducts;
}

async function sumCompletedRevenue() {
  const { NET_SALES } = await getSqlContext();
  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(${NET_SALES}), 0) AS totalRevenue FROM orders`,
  );
  return row.totalRevenue;
}

async function selectTodaySummary(dateFrom, dateTo) {
  const { NET_SALES, afterSale, lowStockCountSql, outOfStockCountSql } = await getSqlContext();
  const [[row]] = await db.query(
    `SELECT
      (SELECT COALESCE(SUM(${NET_SALES}), 0) FROM orders
        WHERE payment_status IN (${PAID_PAYMENT_SQL}) AND ${rangeBetween(ORDER_KL_DATE)}) AS todayRevenue,
      (SELECT COUNT(*) FROM orders
        WHERE payment_status IN (${PAID_PAYMENT_SQL}) AND ${rangeBetween(ORDER_KL_DATE)}) AS todayPaidOrders,
      (SELECT COUNT(*) FROM orders
        WHERE status != '${ORDER_STATUS.CANCELLED}' AND ${rangeBetween(ORDER_KL_DATE)}) AS todayOrders,
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND ${rangeBetween(USER_KL_DATE)}) AS todayNewUsers,
      (SELECT COUNT(*) FROM orders
        WHERE status = '${ORDER_STATUS.PENDING}' OR payment_status IN (${UNPAID_PAYMENT_SQL})) AS pendingPayment,
      (SELECT COUNT(*) FROM orders WHERE status = '${ORDER_STATUS.PAID}') AS pendingShip,
      (SELECT COUNT(*) FROM orders o WHERE ${afterSale.sql}) AS pendingAfterSale,
      ${lowStockCountSql} AS lowStock,
      ${outOfStockCountSql} AS outOfStock`,
    [
      dateFrom,
      dateTo,
      dateFrom,
      dateTo,
      dateFrom,
      dateTo,
      dateFrom,
      dateTo,
      ...afterSale.params,
    ],
  );
  return row;
}

async function selectTodos() {
  const { afterSale, lowStockCountSql, outOfStockCountSql } = await getSqlContext();
  const [[row]] = await db.query(
    `SELECT
      (SELECT COUNT(*) FROM orders WHERE status = '${ORDER_STATUS.PAID}') AS pendingShip,
      (SELECT COUNT(*) FROM orders o WHERE ${afterSale.sql}) AS afterSale,
      (SELECT COUNT(*) FROM orders WHERE payment_status = '${PAYMENT_STATUS.FAILED}') AS paymentFailed,
      ${lowStockCountSql} AS lowStock,
      ${outOfStockCountSql} AS outOfStock`,
    afterSale.params,
  );
  return row;
}

async function selectSalesTrend(dateFrom, dateTo) {
  const { NET_SALES, REFUNDED } = await getSqlContext();
  const [rows] = await db.query(
    `SELECT
      ${ORDER_KL_DATE} AS date,
      COALESCE(SUM(${NET_SALES}), 0) AS sales,
      COUNT(*) AS order_count,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COALESCE(SUM(${REFUNDED}), 0) AS refund_amount
     FROM orders
     WHERE ${rangeBetween(ORDER_KL_DATE)}
     GROUP BY ${ORDER_KL_DATE}
     ORDER BY date ASC`,
    [dateFrom, dateTo],
  );
  return rows;
}

async function selectCategorySalesShare(dateFrom, dateTo) {
  const { ORDER_NET_RATIO, categoryWhere } = await getSqlContext();
  const [rows] = await db.query(
    `SELECT c.name,
      COALESCE(SUM(oi.qty * oi.price * ${ORDER_NET_RATIO}), 0) AS sales_amount,
      COALESCE(SUM(oi.qty), 0) AS sales_qty
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
     LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id
       AND o.payment_status IN (${PAID_PAYMENT_SQL})
       AND ${rangeBetween(klDateSql('o.created_at'))}
     WHERE ${categoryWhere}
     GROUP BY c.id, c.name
     HAVING sales_amount > 0
     ORDER BY sales_amount DESC
     LIMIT 8`,
    [dateFrom, dateTo],
  );
  return rows;
}

async function selectTopProducts(dateFrom, dateTo, asc = false, limit = 10) {
  const { ORDER_NET_RATIO } = await getSqlContext();
  const [rows] = await db.query(
    `SELECT p.id AS product_id, p.name AS product_name,
      COALESCE(SUM(oi.qty), 0) AS sales_qty,
      COALESCE(SUM(oi.qty * oi.price * ${ORDER_NET_RATIO}), 0) AS sales_amount,
      p.stock AS current_stock
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     INNER JOIN products p ON p.id = oi.product_id AND p.deleted_at IS NULL
     WHERE o.payment_status IN (${PAID_PAYMENT_SQL})
       AND ${rangeBetween(klDateSql('o.created_at'))}
     GROUP BY p.id, p.name, p.stock
     ORDER BY sales_qty ${asc ? 'ASC' : 'DESC'}
     LIMIT ?`,
    [dateFrom, dateTo, limit],
  );
  return rows;
}

async function selectLowStockProducts(limit = 10) {
  const { schema } = await getSqlContext();
  if (schema.productVariants) {
    const [rows] = await db.query(
      `SELECT p.id AS product_id, p.name AS product_name,
        MIN(v.stock) AS current_stock,
        MIN(COALESCE(v.stock_warning_threshold, 5)) AS warning_stock
       FROM products p
       INNER JOIN product_variants v ON v.product_id = p.id AND v.deleted_at IS NULL
       WHERE p.deleted_at IS NULL AND p.status = 'active'
         AND v.stock > 0 AND v.stock <= COALESCE(v.stock_warning_threshold, 5)
       GROUP BY p.id, p.name
       ORDER BY current_stock ASC
       LIMIT ?`,
      [limit],
    );
    return rows;
  }
  const [rows] = await db.query(
    `SELECT p.id AS product_id, p.name AS product_name, p.stock AS current_stock,
      COALESCE(p.stock_warning_threshold, 5) AS warning_stock
     FROM products p
     WHERE p.deleted_at IS NULL AND p.status = 'active'
       AND p.stock > 0 AND p.stock <= COALESCE(p.stock_warning_threshold, 5)
     ORDER BY p.stock ASC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function selectRecentOrders(limit = 5) {
  const [rows] = await db.query(
    `SELECT o.id, o.order_no, o.contact_name, o.total_amount, o.status, o.created_at
     FROM orders o ORDER BY o.created_at DESC LIMIT ?`,
    [limit],
  );
  return rows;
}

async function selectAnalyticsMonitor(dateFrom, dateTo) {
  const { schema } = await getSqlContext();
  const empty = {
    contact_whatsapp_click: 0,
    support_qr_view: 0,
    android_download_click: 0,
    pwa_ios_guide_shown: 0,
    pwa_install_button_shown: 0,
    pwa_open_standalone: 0,
    pwa_installed: 0,
    pwa_install_button_clicked: 0,
    pwa_download_page_view: 0,
    support_channel_click: 0,
  };
  if (!schema.analyticsReady) return empty;

  try {
    const [rows] = await db.query(
      `SELECT ae.event_type, COUNT(*) AS cnt
       FROM analytics_events ae
       WHERE ${rangeBetween(AE_KL_DATE)}
         AND ae.event_type IN (
           'contact_whatsapp_click',
           'support_qr_view',
           'support_channel_click',
           'pwa_download_page_view',
           'pwa_install_button_shown',
           'pwa_install_button_clicked',
           'pwa_installed',
           'pwa_ios_guide_shown',
           'pwa_open_standalone'
         )
       GROUP BY ae.event_type`,
      [dateFrom, dateTo],
    );

    const map = Object.fromEntries((rows || []).map((r) => [r.event_type, Number(r.cnt || 0)]));

    let androidCount = 0;
    if (schema.analyticsOs || schema.analyticsDevice) {
      const androidFilter = schema.analyticsOs && schema.analyticsDevice
        ? `(LOWER(ae.os) LIKE '%android%' OR LOWER(ae.device) = 'mobile')`
        : schema.analyticsOs
          ? `LOWER(ae.os) LIKE '%android%'`
          : `LOWER(ae.device) = 'mobile'`;
      const [androidRows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM analytics_events ae
         WHERE ${rangeBetween(AE_KL_DATE)}
           AND ae.event_type = 'pwa_install_button_clicked'
           AND ${androidFilter}`,
        [dateFrom, dateTo],
      );
      androidCount = Number(androidRows[0]?.cnt || 0);
    }

    return {
      contact_whatsapp_click: map.contact_whatsapp_click || 0,
      support_channel_click: map.support_channel_click || 0,
      support_qr_view: map.support_qr_view || 0,
      android_download_click: androidCount,
      pwa_ios_guide_shown: map.pwa_ios_guide_shown || 0,
      pwa_install_button_shown: map.pwa_install_button_shown || 0,
      pwa_open_standalone: map.pwa_open_standalone || 0,
      pwa_installed: map.pwa_installed || 0,
      pwa_install_button_clicked: map.pwa_install_button_clicked || 0,
      pwa_download_page_view: map.pwa_download_page_view || 0,
    };
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR' || e.code === 'ER_NO_SUCH_TABLE') {
      console.warn('[dashboard] analytics monitor downgraded:', e.message);
      return empty;
    }
    throw e;
  }
}

module.exports = {
  countOrdersExcludingCancelled,
  countUsers,
  countProducts,
  sumCompletedRevenue,
  selectTodaySummary,
  selectTodos,
  selectSalesTrend,
  selectCategorySalesShare,
  selectTopProducts,
  selectLowStockProducts,
  selectRecentOrders,
  selectAnalyticsMonitor,
};
