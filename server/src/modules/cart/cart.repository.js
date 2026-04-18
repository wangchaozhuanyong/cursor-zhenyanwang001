const db = require('../../config/db');

async function selectCartLinesWithProducts(userId) {
  const [rows] = await db.query(
    `SELECT p.*, ci.qty
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = ?
     ORDER BY ci.created_at DESC`,
    [userId],
  );
  return rows;
}

async function selectActiveProductId(productId) {
  const [[row]] = await db.query(
    'SELECT id FROM products WHERE id = ? AND status = "active"',
    [productId],
  );
  return row || null;
}

async function upsertCartItem(id, userId, productId, qty) {
  await db.query(
    `INSERT INTO cart_items (id, user_id, product_id, qty)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty), updated_at = NOW()`,
    [id, userId, productId, qty],
  );
}

async function selectCartLine(userId, productId) {
  const [[row]] = await db.query(
    `SELECT p.*, ci.qty
     FROM cart_items ci JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = ? AND ci.product_id = ?`,
    [userId, productId],
  );
  return row || null;
}

async function updateCartItemQty(userId, productId, qty) {
  const [result] = await db.query(
    'UPDATE cart_items SET qty = ?, updated_at = NOW() WHERE user_id = ? AND product_id = ?',
    [qty, userId, productId],
  );
  return result.affectedRows;
}

async function deleteCartItem(userId, productId) {
  await db.query(
    'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
    [userId, productId],
  );
}

async function deleteAllCartItems(userId) {
  await db.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
}

module.exports = {
  selectCartLinesWithProducts,
  selectActiveProductId,
  upsertCartItem,
  selectCartLine,
  updateCartItemQty,
  deleteCartItem,
  deleteAllCartItems,
};
