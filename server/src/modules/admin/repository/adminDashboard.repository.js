const db = require('../../../config/db');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const { orderAfterSalePredicate, orderAfterSaleParams } = require('../../order/orderAfterSale');
const { klDateSql } = require('../../../utils/klDateRange');
const { PAID_PAYMENT_SQL, netSalesExpr, refundedAmountExpr } = require('../../../utils/orderRevenueSql');

const NET_SALES = netSalesExpr('');
const REFUNDED = refundedAmountExpr('');
const ORDER_KL_DATE = klDateSql('created_at');
const USER_KL_DATE = klDateSql('users.created_at');
const AE_KL_DATE = klDateSql('ae.created_at');

function rangeBetween(fieldSql) {
  return `${fieldSql} BETWEEN ? AND ?`;
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
  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(${NET_SALES}), 0) AS totalRevenue FROM orders`,
  );
  return row.totalRevenue;
}

async function selectTodaySummary(todayYmd) {
  const afterSaleSql = orderAfterSalePredicate('o');
  const [[row]] = await db.query(
    `SELECT
      (SELECT COALESCE(SUM(${NET_SALES}), 0) FROM orders
        WHERE payment_status IN (${PAID_PAYMENT_SQL}) AND ${ORDER_KL_DATE} = ?) AS todayRevenue,
      (SELECT COUNT(*) FROM orders
        WHERE payment_status IN (${PAID_PAYMENT_SQL}) AND ${ORDER_KL_DATE} = ?) AS todayPaidOrders,
      (SELECT COUNT(*) FROM orders
        WHERE status != '${ORDER_STATUS.CANCELLED}' AND ${ORDER_KL_DATE} = ?) AS todayOrders,
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND ${USER_KL_DATE} = ?) AS todayNewUsers,
      (SELECT COUNT(*) FROM orders
        WHERE status = '${ORDER_STATUS.PENDING}' OR payment_status IN ('${PAYMENT_STATUS.PENDING}', 'unpaid')) AS pendingPayment,
      (SELECT COUNT(*) FROM orders WHERE status = '${ORDER_STATUS.PAID}') AS pendingShip,
      (SELECT COUNT(*) FROM orders o WHERE ${afterSaleSql}) AS pendingAfterSale,
      (SELECT COUNT(*) FROM products p
        WHERE p.deleted_at IS NULL AND p.status = 'active'
          AND p.stock <= COALESCE(p.stock_warning_threshold, 0)
          AND p.stock > 0) AS lowStock,
      (SELECT COUNT(*) FROM products p
        WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.stock <= 0) AS outOfStock`,
    [
      todayYmd,
      todayYmd,
      todayYmd,
      todayYmd,
      ...orderAfterSaleParams(),
    ],
  );
  return row;
}

async function selectTodos() {
  const afterSaleSql = orderAfterSalePredicate('o');
  const [[row]] = await db.query(
    `SELECT
      (SELECT COUNT(*) FROM orders WHERE status = '${ORDER_STATUS.PAID}') AS pendingShip,
      (SELECT COUNT(*) FROM orders o WHERE ${afterSaleSql}) AS afterSale,
      (SELECT COUNT(*) FROM orders WHERE payment_status = '${PAYMENT_STATUS.FAILED}') AS paymentFailed,
      (SELECT COUNT(*) FROM products p
        WHERE p.deleted_at IS NULL AND p.status = 'active'
          AND p.stock <= COALESCE(p.stock_warning_threshold, 0)
          AND p.stock > 0) AS lowStock,
      (SELECT COUNT(*) FROM products p
        WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.stock <= 0) AS outOfStock`,
    orderAfterSaleParams(),
  );
  return row;
}

async function selectSalesTrend(dateFrom, dateTo) {
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

const ORDER_NET_RATIO = `(CASE WHEN o.total_amount > 0 AND o.payment_status IN (${PAID_PAYMENT_SQL})
  THEN GREATEST(0, o.total_amount - COALESCE(o.refunded_amount, 0)) / o.total_amount ELSE 0 END)`;

async function selectCategorySalesShare(dateFrom, dateTo) {
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
     WHERE c.deleted_at IS NULL
     GROUP BY c.id, c.name
     HAVING sales_amount > 0
     ORDER BY sales_amount DESC
     LIMIT 8`,
    [dateFrom, dateTo],
  );
  return rows;
}

async function selectTopProducts(dateFrom, dateTo, asc = false, limit = 10) {
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
  const [rows] = await db.query(
    `SELECT p.id AS product_id, p.name AS product_name, p.stock AS current_stock,
      p.stock_warning_threshold AS warning_stock
     FROM products p
     WHERE p.deleted_at IS NULL AND p.status = 'active'
       AND p.stock <= COALESCE(p.stock_warning_threshold, 0)
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

async function isAnalyticsReady() {
  try {
    await db.query('SELECT 1 FROM analytics_events LIMIT 1');
    return true;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return false;
    throw e;
  }
}

async function selectAnalyticsMonitor(dateFrom, dateTo) {
  const ready = await isAnalyticsReady();
  if (!ready) {
    return {
      contact_whatsapp_click: 0,
      support_qr_view: 0,
      android_download_click: 0,
      pwa_ios_guide_shown: 0,
      pwa_install_button_shown: 0,
      pwa_open_standalone: 0,
      pwa_installed: 0,
      pwa_install_button_clicked: 0,
    };
  }

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

  const [androidRows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM analytics_events ae
     WHERE ${rangeBetween(AE_KL_DATE)}
       AND ae.event_type = 'pwa_install_button_clicked'
       AND (LOWER(ae.os) LIKE '%android%' OR LOWER(ae.device) = 'mobile')`,
    [dateFrom, dateTo],
  );

  return {
    contact_whatsapp_click: map.contact_whatsapp_click || 0,
    support_channel_click: map.support_channel_click || 0,
    support_qr_view: map.support_qr_view || 0,
    android_download_click: Number(androidRows[0]?.cnt || 0),
    pwa_ios_guide_shown: map.pwa_ios_guide_shown || 0,
    pwa_install_button_shown: map.pwa_install_button_shown || 0,
    pwa_open_standalone: map.pwa_open_standalone || 0,
    pwa_installed: map.pwa_installed || 0,
    pwa_install_button_clicked: map.pwa_install_button_clicked || 0,
    pwa_download_page_view: map.pwa_download_page_view || 0,
  };
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
