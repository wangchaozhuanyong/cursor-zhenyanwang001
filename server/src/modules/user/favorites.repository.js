const db = require('../../config/db');

async function countByUser(userId) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM favorites WHERE user_id = ?',
    [userId],
  );
  return total;
}

async function selectPage(userId, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT f.id AS fav_id, f.created_at AS fav_at, p.*
     FROM favorites f
     JOIN products p ON f.product_id = p.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset],
  );
  return rows;
}

async function findByUserAndProduct(userId, productId) {
  const [[row]] = await db.query(
    'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
    [userId, productId],
  );
  return row || null;
}

async function insert(id, userId, productId) {
  await db.query(
    'INSERT INTO favorites (id, user_id, product_id) VALUES (?,?,?)',
    [id, userId, productId],
  );
}

async function deleteByUserAndProduct(userId, productId) {
  await db.query(
    'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
    [userId, productId],
  );
}

module.exports = {
  countByUser,
  selectPage,
  findByUserAndProduct,
  insert,
  deleteByUserAndProduct,
};
