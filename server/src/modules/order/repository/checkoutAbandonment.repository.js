const db = require('../../../config/db');
const { generateId } = require('../../../utils/helpers');

const GROUP_KEY_EXPR = `CASE
  WHEN ca.order_id IS NOT NULL AND ca.order_id <> '' THEN CONCAT('order:', ca.order_id)
  ELSE CONCAT('checkout:', ca.id)
END`;

function getPool() {
  return db;
}

function toJson(value) {
  return JSON.stringify(value || []);
}

async function insertSnapshot(q, params) {
  const id = params.id || generateId();
  await q.query(
    `INSERT INTO checkout_abandonments
       (id, user_id, status, items_count, items_summary, raw_amount, discount_amount,
        shipping_fee, total_amount, payment_method, contact_name, contact_phone_masked, next_reminder_at)
     VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
    [
      id,
      params.userId,
      params.itemsCount,
      toJson(params.itemsSummary),
      params.rawAmount,
      params.discountAmount,
      params.shippingFee,
      params.totalAmount,
      params.paymentMethod,
      params.contactName,
      params.contactPhoneMasked,
    ],
  );
  return id;
}

async function updateOpenSnapshot(q, id, userId, params) {
  const [result] = await q.query(
    `UPDATE checkout_abandonments
       SET items_count = ?, items_summary = ?, raw_amount = ?,
           discount_amount = ?, shipping_fee = ?, total_amount = ?,
           payment_method = ?, contact_name = ?, contact_phone_masked = ?,
           next_reminder_at = CASE WHEN reminder_count = 0 THEN DATE_ADD(NOW(), INTERVAL 1 HOUR) ELSE next_reminder_at END
     WHERE id = ? AND user_id = ? AND status = 'open'`,
    [
      params.itemsCount,
      toJson(params.itemsSummary),
      params.rawAmount,
      params.discountAmount,
      params.shippingFee,
      params.totalAmount,
      params.paymentMethod,
      params.contactName,
      params.contactPhoneMasked,
      id,
      userId,
    ],
  );
  return result.affectedRows;
}

async function selectSnapshotForUser(q, id, userId) {
  const [[row]] = await q.query(
    'SELECT * FROM checkout_abandonments WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row || null;
}

async function markOrdered(q, id, userId, order) {
  if (!id) return;
  const [result] = await q.query(
    `UPDATE checkout_abandonments
       SET status = 'ordered', order_id = ?, order_no = ?
     WHERE id = ? AND user_id = ? AND status = 'open'`,
    [order.orderId, order.orderNo || '', id, userId],
  );
  if (result.affectedRows > 0) {
    await q.query(
      `UPDATE checkout_abandonments
         SET status = 'closed'
       WHERE user_id = ? AND status = 'open' AND id != ?`,
      [userId, id],
    );
  }
}

async function selectLatestOpenIdForUser(q, userId) {
  const [[row]] = await q.query(
    `SELECT id FROM checkout_abandonments
      WHERE user_id = ? AND status = 'open'
      ORDER BY updated_at DESC
      LIMIT 1`,
    [userId],
  );
  return row?.id || null;
}

async function markPaidByOrderId(q, orderId) {
  await q.query(
    `UPDATE checkout_abandonments
       SET status = 'paid'
     WHERE order_id = ? AND status IN ('open', 'ordered')`,
    [orderId],
  );
}

async function markClosedByOrderId(q, orderId) {
  await q.query(
    `UPDATE checkout_abandonments
       SET status = 'closed'
     WHERE order_id = ? AND status IN ('open', 'ordered')`,
    [orderId],
  );
}

async function countAdminGrouped(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM (
         SELECT ${GROUP_KEY_EXPR} AS group_key
           FROM checkout_abandonments ca
          ${where}
          GROUP BY group_key
       ) grouped`,
    params,
  );
  return total;
}

async function selectAdminGroupedPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `WITH ranked AS (
       SELECT
         ca.*,
         ${GROUP_KEY_EXPR} AS group_key,
         ROW_NUMBER() OVER (
           PARTITION BY ${GROUP_KEY_EXPR}
           ORDER BY ca.updated_at DESC, ca.created_at DESC
         ) AS rn,
         COUNT(*) OVER (
           PARTITION BY ${GROUP_KEY_EXPR}
         ) AS snapshot_count
       FROM checkout_abandonments ca
       ${where}
     )
     SELECT *
       FROM ranked
      WHERE rn = 1
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectDueReminders(limit = 100) {
  const [rows] = await db.query(
    `SELECT * FROM checkout_abandonments
     WHERE status = 'open'
       AND next_reminder_at IS NOT NULL
       AND next_reminder_at <= NOW()
       AND reminder_count < 2
     ORDER BY next_reminder_at ASC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function markReminderSent(id, channel) {
  await db.query(
    `UPDATE checkout_abandonments
     SET reminder_count = reminder_count + 1,
         last_reminded_at = NOW(),
         next_reminder_at = CASE
           WHEN reminder_count = 0 THEN DATE_ADD(NOW(), INTERVAL 23 HOUR)
           ELSE NULL
         END,
         reminder_channel = ?
     WHERE id = ? AND status = 'open' AND reminder_count < 2`,
    [channel || '', id],
  );
}

module.exports = {
  getPool,
  insertSnapshot,
  updateOpenSnapshot,
  selectSnapshotForUser,
  selectLatestOpenIdForUser,
  markOrdered,
  markPaidByOrderId,
  markClosedByOrderId,
  countAdminGrouped,
  selectAdminGroupedPage,
  selectDueReminders,
  markReminderSent,
  GROUP_KEY_EXPR,
};
