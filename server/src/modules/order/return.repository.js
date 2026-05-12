const db = require('../../config/db');

async function countReturnRequests(userId, status) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM return_requests ${where}`, params);
  return total;
}

async function selectReturnRequestsPage(userId, status, pageSize, offset) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await db.query(
    `SELECT * FROM return_requests ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectReturnByIdAndUser(returnId, userId) {
  const [[row]] = await db.query(
    'SELECT * FROM return_requests WHERE id = ? AND user_id = ?',
    [returnId, userId],
  );
  return row || null;
}

async function selectOrderForReturn(orderId, userId) {
  const [[row]] = await db.query(
    'SELECT id, order_no, status FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId],
  );
  return row || null;
}

async function selectOrderItemForReturn(orderId, orderItemId) {
  const [[row]] = await db.query(
    `SELECT id, order_id, product_id, variant_id, sku_code, qty
     FROM order_items
     WHERE id = ? AND order_id = ?`,
    [orderItemId, orderId],
  );
  return row || null;
}

async function countActiveReturnRequests(orderId, userId, orderItemId) {
  const itemClause = orderItemId ? ' AND order_item_id = ?' : '';
  const params = orderItemId ? [orderId, userId, orderItemId] : [orderId, userId];
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM return_requests
      WHERE order_id = ? AND user_id = ?${itemClause}
        AND status IN ('pending', 'approved', 'processing', 'requested', 'needs_evidence', 'return_in_transit', 'received')`,
    params,
  );
  return Number(rows?.[0]?.total || 0);
}

async function insertReturnRequest(params) {
  const {
    id, userId, orderId, orderNo, orderItemId, productId, variantId, skuCode,
    quantity, type, reason, description, imagesJson, status,
  } = params;
  await db.query(
    `INSERT INTO return_requests
       (id, user_id, order_id, order_no, order_item_id, product_id, variant_id, sku_code,
        quantity, type, reason, description, images, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, userId, orderId, orderNo, orderItemId || null, productId || null, variantId || null,
      skuCode || '', quantity || 1, type, reason, description, imagesJson, status,
    ],
  );
}

async function selectReturnById(returnId) {
  const [[row]] = await db.query('SELECT * FROM return_requests WHERE id = ?', [returnId]);
  return row || null;
}

module.exports = {
  countReturnRequests,
  selectReturnRequestsPage,
  selectReturnByIdAndUser,
  selectOrderForReturn,
  selectOrderItemForReturn,
  countActiveReturnRequests,
  insertReturnRequest,
  selectReturnById,
};
