const db = require('../../../config/db');
const { PAYMENT_STATUS } = require('../../../constants/status');

async function selectCreatedOrderEvents(since, limit) {
  const [rows] = await db.query(
    `SELECT id, order_no, total_amount, created_at
     FROM orders
     WHERE created_at > ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [since, limit],
  );
  return rows;
}

async function selectPaidOrderEvents(since, limit) {
  const [rows] = await db.query(
    `SELECT id, order_no, total_amount, COALESCE(paid_at, payment_time) AS paid_event_at
     FROM orders
     WHERE payment_status = ?
       AND COALESCE(paid_at, payment_time) > ?
     ORDER BY paid_event_at ASC
     LIMIT ?`,
    [PAYMENT_STATUS.PAID, since, limit],
  );
  return rows;
}

module.exports = {
  selectCreatedOrderEvents,
  selectPaidOrderEvents,
};
