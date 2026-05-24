const db = require('../../../config/db');
const { PAID_PAYMENT_STATUS_LIST } = require('../../../constants/status');

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
  const placeholders = PAID_PAYMENT_STATUS_LIST.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT id, order_no, total_amount, COALESCE(paid_at, payment_time) AS paid_event_at
     FROM orders
     WHERE payment_status IN (${placeholders})
       AND COALESCE(paid_at, payment_time) > ?
     ORDER BY paid_event_at ASC
     LIMIT ?`,
    [...PAID_PAYMENT_STATUS_LIST, since, limit],
  );
  return rows;
}

module.exports = {
  selectCreatedOrderEvents,
  selectPaidOrderEvents,
};
