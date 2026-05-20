const db = require('../../../config/db');

const cartLineSelect = `
  SELECT p.*,
         ci.qty,
         ci.variant_id,
         ci.sku_code,
         COALESCE((
           SELECT NULLIF(GROUP_CONCAT(psv.value ORDER BY psg.sort_order ASC, psv.sort_order ASC SEPARATOR ' / '), '')
           FROM product_variant_spec_values pvsv
           JOIN product_spec_groups psg ON psg.id = pvsv.group_id AND psg.deleted_at IS NULL
           JOIN product_spec_values psv ON psv.id = pvsv.value_id AND psv.deleted_at IS NULL
           WHERE pvsv.variant_id = pv.id
         ), pv.title, '') AS variant_name,
         COALESCE(pv.price, p.price) AS price,
         COALESCE(pv.stock, p.stock) AS stock
  FROM cart_items ci
  JOIN products p ON ci.product_id = p.id
  LEFT JOIN product_variants pv ON ci.variant_id <> '' AND pv.id = ci.variant_id AND pv.deleted_at IS NULL AND pv.enabled = 1
`;

async function selectCartLinesWithProducts(userId) {
  const [rows] = await db.query(
    `${cartLineSelect}
     WHERE ci.user_id = ? AND p.lifecycle_status = 1 AND p.deleted_at IS NULL
     ORDER BY ci.created_at DESC`,
    [userId],
  );
  return rows;
}

async function selectActiveProductId(productId) {
  const [[row]] = await db.query(
    'SELECT id, name, stock FROM products WHERE id = ? AND lifecycle_status = 1 AND deleted_at IS NULL',
    [productId],
  );
  return row || null;
}

async function selectDefaultVariant(productId) {
  const [[row]] = await db.query(
    `SELECT id, product_id, sku_code, title, price, stock
     FROM product_variants
     WHERE product_id = ? AND deleted_at IS NULL AND enabled = 1
     ORDER BY is_default DESC, sort_order ASC, id ASC
     LIMIT 1`,
    [productId],
  );
  return row || null;
}

async function selectActiveVariant(productId, variantId) {
  if (!variantId) return null;
  const [[row]] = await db.query(
    `SELECT id, product_id, sku_code, title, price, stock
     FROM product_variants
     WHERE id = ? AND product_id = ? AND deleted_at IS NULL AND enabled = 1`,
    [variantId, productId],
  );
  return row || null;
}

async function upsertCartItem(id, userId, productId, qty, variantId = '', skuCode = '') {
  await db.query(
    `INSERT INTO cart_items (id, user_id, product_id, variant_id, sku_code, qty)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty), updated_at = NOW()`,
    [id, userId, productId, variantId || '', skuCode || '', qty],
  );
}

async function selectCartLine(userId, productId, variantId = '') {
  const [[row]] = await db.query(
    `${cartLineSelect}
     WHERE ci.user_id = ? AND ci.product_id = ? AND ci.variant_id = ?
       AND p.lifecycle_status = 1 AND p.deleted_at IS NULL`,
    [userId, productId, variantId || ''],
  );
  return row || null;
}

async function updateCartItemQty(userId, productId, qty, variantId = '') {
  const [result] = await db.query(
    'UPDATE cart_items SET qty = ?, updated_at = NOW() WHERE user_id = ? AND product_id = ? AND variant_id = ?',
    [qty, userId, productId, variantId || ''],
  );
  return result.affectedRows;
}

async function deleteCartItem(userId, productId, variantId = '') {
  await db.query(
    'DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id = ?',
    [userId, productId, variantId || ''],
  );
}

async function deleteAllCartItems(userId) {
  await db.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
}

module.exports = {
  selectCartLinesWithProducts,
  selectActiveProductId,
  selectDefaultVariant,
  selectActiveVariant,
  upsertCartItem,
  selectCartLine,
  updateCartItemQty,
  deleteCartItem,
  deleteAllCartItems,
};
