const db = require('../../config/db');
const { PAID_PAYMENT_STATUS_LIST } = require('../../constants/status');

const PAID_PAYMENT_SQL = PAID_PAYMENT_STATUS_LIST.map((s) => `'${s}'`).join(', ');

/**
 * 与订单域一致：报表收入/销量仅统计已产生有效支付的订单（paid / partially_refunded）
 */

async function selectSalesChart(days) {
  const [rows] = await db.query(
    `SELECT DATE(o.created_at) AS date,
            COUNT(*) AS orders,
            COALESCE(SUM(o.total_amount), 0) AS revenue
     FROM orders o
     WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND o.payment_status IN (${PAID_PAYMENT_SQL})
     GROUP BY DATE(o.created_at) ORDER BY date ASC`,
    [days],
  );
  return rows;
}

async function sumRevenueInRange(days) {
  const [[{ totalRevenue }]] = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue
     FROM orders
     WHERE payment_status IN (${PAID_PAYMENT_SQL})
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days],
  );
  return totalRevenue;
}

async function countPaidOrdersInRange(days) {
  const [[{ totalOrders }]] = await db.query(
    `SELECT COUNT(*) AS totalOrders
     FROM orders
     WHERE payment_status IN (${PAID_PAYMENT_SQL})
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days],
  );
  return totalOrders;
}

async function selectUserRegistrationsByDay(days) {
  const [rows] = await db.query(
    `SELECT DATE(created_at) AS date, COUNT(*) AS newUsers
     FROM users
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at) ORDER BY date ASC`,
    [days],
  );
  return rows;
}

async function countAllUsers() {
  const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
  return totalUsers;
}

/**
 * 已支付订单下的 SKU 销量与行金额合计（order_items.price）
 */
async function selectTopProductsSold() {
  const [topProducts] = await db.query(
    `SELECT p.id, p.name, p.cover_image, SUM(oi.qty) AS totalSold,
            SUM(oi.qty * oi.price) AS totalRevenue
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     JOIN orders o ON oi.order_id = o.id
     WHERE o.payment_status IN (${PAID_PAYMENT_SQL})
     GROUP BY p.id, p.name, p.cover_image
     ORDER BY totalSold DESC
     LIMIT 20`,
  );
  return topProducts;
}

module.exports = {
  selectSalesChart,
  sumRevenueInRange,
  countPaidOrdersInRange,
  selectUserRegistrationsByDay,
  countAllUsers,
  selectTopProductsSold,
};
