const db = require('../../config/db');

async function countProducts(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM products ${where}`, params);
  return total;
}

async function selectProductsPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT * FROM products ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectProductsForExport(where, params) {
  const [rows] = await db.query(
    `SELECT * FROM products ${where} ORDER BY sort_order ASC, created_at DESC`,
    params,
  );
  return rows;
}

async function selectProductById(id) {
  const [[row]] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  return row || null;
}

async function insertProduct(params) {
  const {
    id, name, cover_image, imagesJson, price, original_price, sales_count,
    points, category_id, stock,
    status, sort_order, description, is_recommended, is_new, is_hot,
  } = params;
  await db.query(
    `INSERT INTO products (id, name, cover_image, images, price, original_price, sales_count,
      points, category_id, stock,
      status, sort_order, description, is_recommended, is_new, is_hot)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, name, cover_image, imagesJson, price,
      original_price ?? null,
      Number.isFinite(sales_count) ? sales_count : 0,
      points, category_id, stock,
      status, sort_order, description, is_recommended, is_new, is_hot,
    ],
  );
}

async function updateProductDynamic(setFragments, values, id) {
  await db.query(`UPDATE products SET ${setFragments.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteProductById(id, deletedBy) {
  await db.query('UPDATE products SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy || null, id]);
}

async function restoreProductById(id) {
  await db.query('UPDATE products SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
}

async function batchUpdateStatus(ids, status) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.query(`UPDATE products SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);
}

module.exports = {
  countProducts,
  selectProductsPage,
  selectProductsForExport,
  selectProductById,
  insertProduct,
  updateProductDynamic,
  deleteProductById,
  restoreProductById,
  batchUpdateStatus,
};
