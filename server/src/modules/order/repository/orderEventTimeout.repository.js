const db = require('../../../config/db');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');

function paidStatusSql() {
  return `'${PAYMENT_STATUS.PAID}', '${PAYMENT_STATUS.PARTIALLY_REFUNDED}'`;
}

async function selectPaidUnhandledOrders(minutes, limit = 100) {
  const [rows] = await db.query(
    `SELECT id, order_no, user_id, status, payment_status, total_amount, paid_at, payment_time, created_at
     FROM orders
     WHERE status = ?
       AND payment_status IN (${paidStatusSql()})
       AND COALESCE(paid_at, payment_time, created_at) <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
     ORDER BY COALESCE(paid_at, payment_time, created_at) ASC
     LIMIT ?`,
    [ORDER_STATUS.PAID, minutes, limit],
  );
  return rows;
}

async function selectShipTimeoutOrders(minutes, limit = 100) {
  const [rows] = await db.query(
    `SELECT id, order_no, user_id, status, payment_status, total_amount, paid_at, payment_time, created_at
     FROM orders
     WHERE status = ?
       AND payment_status IN (${paidStatusSql()})
       AND COALESCE(paid_at, payment_time, created_at) <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
     ORDER BY COALESCE(paid_at, payment_time, created_at) ASC
     LIMIT ?`,
    [ORDER_STATUS.PAID, minutes, limit],
  );
  return rows;
}

async function selectOrderStates(orderIds = []) {
  if (!orderIds.length) return new Map();
  const placeholders = orderIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT id, status, payment_status
     FROM orders
     WHERE id IN (${placeholders})`,
    orderIds,
  );
  return new Map(rows.map((row) => [row.id, row]));
}

module.exports = {
  selectPaidUnhandledOrders,
  selectShipTimeoutOrders,
  selectOrderStates,
};
