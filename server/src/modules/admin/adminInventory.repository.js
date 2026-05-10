const db = require('../../config/db');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

async function countProducts(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}`,
    params,
  );
  return total;
}

async function selectProductsPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
       p.id,
       p.name,
       p.cover_image,
       p.stock,
       p.stock_warning_threshold,
       p.status,
       p.lifecycle_status,
       p.created_at AS updated_at,
       c.name AS category_name,
       v.id AS default_variant_id,
       v.stock AS default_variant_stock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1
     ${where}
     ORDER BY
       CASE WHEN p.stock <= COALESCE(p.stock_warning_threshold, 5) THEN 0 ELSE 1 END,
       p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectProductForUpdate(conn, productId) {
  const [[row]] = await conn.query(
    `SELECT p.*, v.id AS default_variant_id
     FROM products p
     LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1
     WHERE p.id = ? AND p.deleted_at IS NULL
     FOR UPDATE`,
    [productId],
  );
  return row || null;
}

async function updateProductStock(conn, productId, stock) {
  await conn.query('UPDATE products SET stock = ? WHERE id = ?', [stock, productId]);
  await conn.query(
    'UPDATE product_variants SET stock = ? WHERE product_id = ? AND is_default = 1',
    [stock, productId],
  );
}

async function updateProductWarningThreshold(productId, threshold) {
  await db.query(
    'UPDATE products SET stock_warning_threshold = ? WHERE id = ? AND deleted_at IS NULL',
    [threshold, productId],
  );
  await db.query(
    'UPDATE product_variants SET stock_warning_threshold = ? WHERE product_id = ? AND is_default = 1',
    [threshold, productId],
  );
}

async function insertStockRecord(conn, params) {
  const q = conn || db;
  const {
    id,
    productId,
    variantId,
    changeType,
    quantityDelta,
    beforeStock,
    afterStock,
    reason,
    refType,
    refId,
    operatorId,
  } = params;
  await q.query(
    `INSERT INTO inventory_stock_records
       (id, product_id, variant_id, change_type, quantity_delta, before_stock,
        after_stock, reason, ref_type, ref_id, operator_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      productId,
      variantId || null,
      changeType,
      quantityDelta,
      beforeStock,
      afterStock,
      reason || '',
      refType || '',
      refId || '',
      operatorId || null,
    ],
  );
}

async function countStockRecords(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM inventory_stock_records r
     JOIN products p ON p.id = r.product_id
     ${where}`,
    params,
  );
  return total;
}

async function selectStockRecordsPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
       r.*,
       p.name AS product_name,
       p.cover_image AS product_image,
       u.nickname AS operator_name
     FROM inventory_stock_records r
     JOIN products p ON p.id = r.product_id
     LEFT JOIN users u ON u.id = r.operator_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

module.exports = {
  getPool,
  getConnection,
  countProducts,
  selectProductsPage,
  selectProductForUpdate,
  updateProductStock,
  updateProductWarningThreshold,
  insertStockRecord,
  countStockRecords,
  selectStockRecordsPage,
};
