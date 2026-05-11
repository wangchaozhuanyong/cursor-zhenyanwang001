const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');

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
        shipping_fee, total_amount, payment_method, contact_name, contact_phone_masked)
     VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
           payment_method = ?, contact_name = ?, contact_phone_masked = ?
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
  await q.query(
    `UPDATE checkout_abandonments
       SET status = 'ordered', order_id = ?, order_no = ?
     WHERE id = ? AND user_id = ? AND status = 'open'`,
    [order.orderId, order.orderNo || '', id, userId],
  );
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

async function countAdmin(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM checkout_abandonments ca ${where}`, params);
  return total;
}

async function selectAdminPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT ca.*
       FROM checkout_abandonments ca
      ${where}
      ORDER BY ca.updated_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

module.exports = {
  getPool,
  insertSnapshot,
  updateOpenSnapshot,
  selectSnapshotForUser,
  markOrdered,
  markPaidByOrderId,
  markClosedByOrderId,
  countAdmin,
  selectAdminPage,
};
