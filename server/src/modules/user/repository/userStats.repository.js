const db = require('../../../config/db');
const { generateId } = require('../../../utils/helpers');

function getConnection() {
  return db.getConnection();
}

async function ensureRow(q, userId) {
  await q.query(
    `INSERT IGNORE INTO user_statistics (user_id) VALUES (?)`,
    [userId],
  );
}

async function insertEventIfAbsent(q, params) {
  const { userId, orderId, eventType } = params;
  const [result] = await q.query(
    `INSERT IGNORE INTO user_statistics_events (id, user_id, order_id, event_type)
     VALUES (?, ?, ?, ?)`,
    [generateId(), userId, orderId, eventType],
  );
  return Number(result?.affectedRows || 0) > 0;
}

async function incrementPaidStats(q, userId, amount) {
  await q.query(
    `UPDATE user_statistics
       SET total_spent = total_spent + ?,
           valid_order_count = valid_order_count + 1,
           average_order_value = ROUND((total_spent + ?) / (valid_order_count + 1), 2),
           first_purchase_at = COALESCE(first_purchase_at, NOW()),
           last_purchase_at = NOW()
     WHERE user_id = ?`,
    [amount, amount, userId],
  );
}

async function refreshRefundRate(q, userId) {
  await q.query(
    `UPDATE user_statistics
       SET refund_rate = IF(valid_order_count <= 0, 0, ROUND(refund_count / valid_order_count, 4))
     WHERE user_id = ?`,
    [userId],
  );
}

async function incrementRefundStats(q, userId) {
  await q.query(
    `UPDATE user_statistics
       SET refund_count = refund_count + 1,
           refund_rate = IF(valid_order_count <= 0, 0, ROUND((refund_count + 1) / valid_order_count, 4))
     WHERE user_id = ?`,
    [userId],
  );
}

async function decrementPaidStats(q, userId, amount) {
  const delta = Math.max(0, Number(amount) || 0);
  if (delta <= 0) return;
  await q.query(
    `UPDATE user_statistics
       SET total_spent = GREATEST(0, total_spent - ?),
           average_order_value = IF(
             valid_order_count <= 0,
             0,
             ROUND(GREATEST(0, total_spent - ?) / valid_order_count, 2)
           )
     WHERE user_id = ?`,
    [delta, delta, userId],
  );
  await refreshRefundRate(q, userId);
}

async function incrementCancelledOrderCount(q, userId) {
  await q.query(
    `UPDATE user_statistics
       SET cancelled_order_count = cancelled_order_count + 1
     WHERE user_id = ?`,
    [userId],
  );
}

module.exports = {
  getConnection,
  ensureRow,
  insertEventIfAbsent,
  incrementPaidStats,
  refreshRefundRate,
  incrementRefundStats,
  decrementPaidStats,
  incrementCancelledOrderCount,
};


