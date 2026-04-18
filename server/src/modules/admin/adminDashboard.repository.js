const db = require('../../config/db');
const { ORDER_STATUS, PAID_PAYMENT_STATUS_LIST } = require('../../constants/status');

const PAID_PAYMENT_SQL = PAID_PAYMENT_STATUS_LIST.map((s) => `'${s}'`).join(',');

async function countOrdersExcludingCancelled() {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS totalOrders FROM orders WHERE status != '${ORDER_STATUS.CANCELLED}'`,
  );
  return row.totalOrders;
}

async function countUsers() {
  const [[row]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
  return row.totalUsers;
}

async function countProducts() {
  const [[row]] = await db.query('SELECT COUNT(*) AS totalProducts FROM products');
  return row.totalProducts;
}

async function sumCompletedRevenue() {
  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue FROM orders WHERE payment_status IN (${PAID_PAYMENT_SQL})`,
  );
  return row.totalRevenue;
}

async function countTodayOrders() {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS todayOrders FROM orders WHERE DATE(created_at) = CURDATE() AND status != '${ORDER_STATUS.CANCELLED}'`,
  );
  return row.todayOrders;
}

async function countPendingOrders() {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS pendingOrders FROM orders WHERE status IN ('${ORDER_STATUS.PENDING}', '${ORDER_STATUS.PAID}')`,
  );
  return row.pendingOrders;
}

async function sumTodayRevenue() {
  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS todayRevenue FROM orders WHERE payment_status IN (${PAID_PAYMENT_SQL}) AND DATE(created_at) = CURDATE()`,
  );
  return row.todayRevenue;
}

async function countTodayNewUsers() {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS todayNewUsers FROM users WHERE DATE(created_at) = CURDATE()',
  );
  return row.todayNewUsers;
}

async function selectSalesTrend7d() {
  const [rows] = await db.query(
    `SELECT DATE(created_at) AS date,
            COALESCE(SUM(total_amount), 0) AS sales
     FROM orders
     WHERE payment_status IN (${PAID_PAYMENT_SQL}) AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DATE(created_at) ORDER BY date ASC`,
  );
  return rows;
}

async function selectWeeklyOrdersBreakdown() {
  const [rows] = await db.query(
    `SELECT DAYNAME(created_at) AS day,
            SUM(CASE WHEN status = '${ORDER_STATUS.COMPLETED}' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = '${ORDER_STATUS.CANCELLED}' THEN 1 ELSE 0 END) AS cancelled
     FROM orders
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DAYNAME(created_at), DAYOFWEEK(created_at) ORDER BY DAYOFWEEK(created_at) ASC`,
  );
  return rows;
}

async function selectCategoryProductCounts() {
  const [rows] = await db.query(
    `SELECT c.name, COUNT(p.id) AS value
     FROM categories c LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id, c.name ORDER BY value DESC LIMIT 6`,
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

async function selectChart30d() {
  const [rows] = await db.query(
    `SELECT DATE(created_at) AS date,
            COUNT(*) AS orders,
            COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN total_amount ELSE 0 END), 0) AS revenue
     FROM orders
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY DATE(created_at) ORDER BY date ASC`,
  );
  return rows;
}

module.exports = {
  countOrdersExcludingCancelled,
  countUsers,
  countProducts,
  sumCompletedRevenue,
  countTodayOrders,
  countPendingOrders,
  sumTodayRevenue,
  countTodayNewUsers,
  selectSalesTrend7d,
  selectWeeklyOrdersBreakdown,
  selectCategoryProductCounts,
  selectRecentOrders,
  selectChart30d,
};
