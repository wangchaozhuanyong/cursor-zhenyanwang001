const db = require('../../config/db');

async function countByUser(userId) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM browsing_history WHERE user_id = ?',
    [userId],
  );
  return total;
}

async function selectPage(userId, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT bh.id AS history_id, bh.viewed_at, p.*
     FROM browsing_history bh
     JOIN products p ON bh.product_id = p.id
     WHERE bh.user_id = ?
     ORDER BY bh.viewed_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset],
  );
  return rows;
}

async function deletePair(userId, productId) {
  await db.query(
    'DELETE FROM browsing_history WHERE user_id = ? AND product_id = ?',
    [userId, productId],
  );
}

async function insert(id, userId, productId) {
  await db.query(
    'INSERT INTO browsing_history (id, user_id, product_id) VALUES (?,?,?)',
    [id, userId, productId],
  );
}

async function countRows(userId) {
  const [[{ cnt }]] = await db.query(
    'SELECT COUNT(*) AS cnt FROM browsing_history WHERE user_id = ?',
    [userId],
  );
  return cnt;
}

/** 删除该用户最旧的若干条（MySQL DELETE … ORDER BY … LIMIT） */
async function deleteOldest(userId, limit) {
  await db.query(
    'DELETE FROM browsing_history WHERE user_id = ? ORDER BY viewed_at ASC LIMIT ?',
    [userId, limit],
  );
}

async function clearUser(userId) {
  await db.query('DELETE FROM browsing_history WHERE user_id = ?', [userId]);
}

module.exports = {
  countByUser,
  selectPage,
  deletePair,
  insert,
  countRows,
  deleteOldest,
  clearUser,
};
