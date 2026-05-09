const db = require('../../config/db');

async function selectVariantsByProductId(productId) {
  const [rows] = await db.query(
    `SELECT id, product_id, sku_code, title, price, stock, sort_order, is_default, created_at
     FROM product_variants WHERE product_id = ?
     ORDER BY is_default DESC, sort_order ASC, created_at ASC`,
    [productId],
  );
  return rows;
}

async function replaceProductVariants(productId, rows) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
    for (const r of rows) {
      await conn.query(
        `INSERT INTO product_variants (id, product_id, sku_code, title, price, stock, sort_order, is_default)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          r.id,
          productId,
          r.sku_code ?? null,
          r.title ?? '',
          r.price,
          r.stock,
          r.sort_order ?? 0,
          r.is_default ? 1 : 0,
        ],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateDefaultVariantPriceStock(productId, price, stock) {
  await db.query(
    'UPDATE product_variants SET price = ?, stock = ? WHERE product_id = ? AND is_default = 1 LIMIT 1',
    [price, stock, productId],
  );
}

module.exports = {
  selectVariantsByProductId,
  replaceProductVariants,
  updateDefaultVariantPriceStock,
};
