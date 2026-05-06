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

async function countActiveReturnRequests(orderId, userId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM return_requests
     WHERE order_id = ? AND user_id = ? AND status IN ('pending', 'approved', 'processing')`,
    [orderId, userId],
  );
  return Number(rows?.[0]?.total || 0);
}

async function insertReturnRequest(params) {
  const {
    id, userId, orderId, orderNo, type, reason, description, imagesJson, status,
  } = params;
  await db.query(
    `INSERT INTO return_requests (id, user_id, order_id, order_no, type, reason, description, images, status)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, userId, orderId, orderNo, type, reason, description, imagesJson, status],
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
  countActiveReturnRequests,
  insertReturnRequest,
  selectReturnById,
};
