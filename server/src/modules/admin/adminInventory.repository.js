const db = require('../../config/db');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

async function syncProductStockByProductId(conn, productId) {
  await conn.query(
    `UPDATE products p
     SET p.stock = COALESCE((
       SELECT SUM(v.stock)
       FROM product_variants v
       WHERE v.product_id = p.id AND v.deleted_at IS NULL
     ), 0)
     WHERE p.id = ?`,
    [productId],
  );
}

async function selectInventorySummary() {
  const [[row]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM products p WHERE p.deleted_at IS NULL) AS total_products,
       (SELECT COUNT(*) FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL AND v.deleted_at IS NULL) AS total_skus,
       (SELECT COALESCE(SUM(v.stock),0) FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL AND v.deleted_at IS NULL) AS total_stock,
       (SELECT COUNT(*) FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL AND v.deleted_at IS NULL AND v.stock <= COALESCE(v.stock_warning_threshold,5)) AS low_stock_skus,
       (SELECT COUNT(*) FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL AND v.deleted_at IS NULL AND v.stock <= 0) AS out_of_stock_skus,
       (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_stock_records WHERE DATE(created_at)=CURDATE() AND change_type='in') AS today_in_qty,
       (SELECT COALESCE(SUM(ABS(quantity_delta)),0) FROM inventory_stock_records WHERE DATE(created_at)=CURDATE() AND change_type='out') AS today_out_qty,
       (SELECT COALESCE(SUM(ABS(quantity_delta)),0) FROM inventory_stock_records WHERE DATE(created_at)=CURDATE() AND change_type='order_deduct') AS today_order_deduct_qty`,
  );
  return row;
}

async function countSkus(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}`,
    params,
  );
  return total;
}

async function selectSkusPage(where, params, sortSql, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
       p.id AS product_id,
       p.name AS product_name,
       p.cover_image,
       p.lifecycle_status,
       c.name AS category_name,
       v.id AS variant_id,
       v.title AS variant_title,
       v.sku_code,
       v.stock,
       v.reserved_stock,
       (v.stock - COALESCE(v.reserved_stock,0)) AS available_stock,
       v.stock_warning_threshold,
       (v.stock <= COALESCE(v.stock_warning_threshold,5)) AS low_stock,
       (v.stock <= 0) AS out_of_stock,
       v.updated_at
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ${sortSql}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectVariantForUpdate(conn, variantId) {
  const [[row]] = await conn.query(
    `SELECT
       v.id,
       v.product_id,
       v.title,
       v.sku_code,
       v.stock,
       v.reserved_stock,
       v.stock_warning_threshold,
       p.name AS product_name
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id = ? AND v.deleted_at IS NULL AND p.deleted_at IS NULL
     FOR UPDATE`,
    [variantId],
  );
  return row || null;
}

async function updateVariantStock(conn, variantId, stock) {
  await conn.query('UPDATE product_variants SET stock = ? WHERE id = ?', [stock, variantId]);
}

async function updateVariantWarningThreshold(variantId, threshold) {
  await db.query(
    'UPDATE product_variants SET stock_warning_threshold = ? WHERE id = ? AND deleted_at IS NULL',
    [threshold, variantId],
  );
}

async function batchUpdateVariantWarningThreshold(ids, threshold) {
  if (!ids.length) return 0;
  const [result] = await db.query(
    `UPDATE product_variants SET stock_warning_threshold = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
    [threshold, ...ids],
  );
  return result.affectedRows || 0;
}

async function selectProductVariants(productId) {
  const [rows] = await db.query(
    `SELECT id, title, sku_code, stock, is_default
     FROM product_variants
     WHERE product_id = ? AND deleted_at IS NULL
     ORDER BY is_default DESC, sort_order ASC, created_at ASC`,
    [productId],
  );
  return rows;
}

async function selectProductById(productId) {
  const [[row]] = await db.query('SELECT id, name FROM products WHERE id = ? AND deleted_at IS NULL', [productId]);
  return row || null;
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
    productNameSnapshot,
    variantNameSnapshot,
    skuCodeSnapshot,
    orderNoSnapshot,
    sourceNo,
    remark,
    costPrice,
    createdByType,
  } = params;
  await q.query(
    `INSERT INTO inventory_stock_records
       (id, product_id, variant_id, change_type, quantity_delta, before_stock,
        after_stock, reason, ref_type, ref_id, operator_id,
        product_name_snapshot, variant_name_snapshot, sku_code_snapshot,
        order_no_snapshot, source_no, remark, cost_price, created_by_type)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      productNameSnapshot || '',
      variantNameSnapshot || '',
      skuCodeSnapshot || '',
      orderNoSnapshot || '',
      sourceNo || '',
      remark || '',
      costPrice == null ? null : Number(costPrice),
      createdByType || 'admin',
    ],
  );
}

async function countStockRecords(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM inventory_stock_records r
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
       v.title AS variant_title,
       v.sku_code AS variant_sku_code,
       u.nickname AS operator_name,
       o.order_no AS order_no
     FROM inventory_stock_records r
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN product_variants v ON v.id = r.variant_id
     LEFT JOIN users u ON u.id = r.operator_id
     LEFT JOIN orders o ON r.ref_type = 'order' AND o.id = r.ref_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectSkuExportRows(where, params, sortSql) {
  const [rows] = await db.query(
    `SELECT
       p.id AS product_id,
       p.name AS product_name,
       p.cover_image,
       c.name AS category_name,
       p.lifecycle_status,
       v.id AS variant_id,
       v.title AS variant_title,
       v.sku_code,
       v.stock,
       v.reserved_stock,
       (v.stock - COALESCE(v.reserved_stock,0)) AS available_stock,
       v.stock_warning_threshold,
       v.updated_at
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ${sortSql}`,
    params,
  );
  return rows;
}

module.exports = {
  getPool,
  getConnection,
  syncProductStockByProductId,
  selectInventorySummary,
  countSkus,
  selectSkusPage,
  selectVariantForUpdate,
  updateVariantStock,
  updateVariantWarningThreshold,
  batchUpdateVariantWarningThreshold,
  selectProductVariants,
  selectProductById,
  insertStockRecord,
  countStockRecords,
  selectStockRecordsPage,
  selectSkuExportRows,
};

