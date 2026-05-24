const db = require('../../../config/db');
const { PRODUCT_LIST_FROM, buildProductListQuery } = require('./adminProductListQuery');

async function countProducts(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total ${PRODUCT_LIST_FROM} ${where}`,
    params,
  );
  return total;
}

async function selectProductsPage(where, params, pageSize, offset, sort) {
  const { sql, params: queryParams } = buildProductListQuery(where, params, {
    pageSize,
    offset,
    sort,
  });
  const [rows] = await db.query(sql, queryParams);
  return rows;
}

async function selectProductsForExport(where, params, sort) {
  const { sql, params: queryParams } = buildProductListQuery(where, params, { sort });
  const [rows] = await db.query(sql, queryParams);
  return rows;
}

async function selectProductById(id, opts = {}) {
  const includeDeleted = !!opts.includeDeleted;
  const [[row]] = await db.query(
    `SELECT * FROM products WHERE id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
    [id],
  );
  return row || null;
}

async function insertProduct(params) {
  const {
    id, name, cover_image, video_url, imagesJson, price, original_price, sales_count,
    category_id, stock, stock_warning_threshold, stock_lower_limit, stock_upper_limit,
    status, lifecycle_status, sort_order, description, search_keywords,
    is_recommended, is_new, is_hot,
  } = params;
  await db.query(
    `INSERT INTO products (id, name, cover_image, video_url, images, price, original_price, sales_count,
      category_id, stock, stock_warning_threshold, stock_lower_limit, stock_upper_limit,
      status, lifecycle_status, sort_order, description, search_keywords, is_recommended, is_new, is_hot)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, name, cover_image, video_url || '', imagesJson, price,
      original_price ?? null,
      Number.isFinite(sales_count) ? sales_count : 0,
      category_id, stock, stock_warning_threshold ?? 5, stock_lower_limit ?? null, stock_upper_limit ?? null,
      status,
      lifecycle_status ?? 1,
      sort_order, description, search_keywords || '', is_recommended, is_new, is_hot,
    ],
  );
}

async function updateProductDynamic(setFragments, values, id) {
  await db.query(`UPDATE products SET ${setFragments.join(', ')} WHERE id = ? AND deleted_at IS NULL`, [...values, id]);
}

async function updateProductDynamicWithVersion(setFragments, values, id, version) {
  const [result] = await db.query(
    `UPDATE products SET ${setFragments.join(', ')}, version = version + 1 WHERE id = ? AND version = ? AND deleted_at IS NULL`,
    [...values, id, Number(version)],
  );
  return result.affectedRows;
}

async function deleteProductById(id, deletedBy) {
  await db.query('UPDATE products SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy || null, id]);
}

async function restoreProductById(id) {
  await db.query('UPDATE products SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
}

async function batchUpdateStatus(ids, status, lifecycleStatus) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const [result] = await db.query(
    `UPDATE products SET status = ?, lifecycle_status = ? WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    [status, lifecycleStatus, ...ids],
  );
  return result.affectedRows || 0;
}

module.exports = {
  countProducts,
  selectProductsPage,
  selectProductsForExport,
  selectProductById,
  insertProduct,
  updateProductDynamic,
  updateProductDynamicWithVersion,
  deleteProductById,
  restoreProductById,
  batchUpdateStatus,
};
