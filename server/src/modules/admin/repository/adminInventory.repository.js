const db = require('../../../config/db');
const { syncProductStockFromVariants } = require('../../product/productStockSync');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

async function syncProductStockByProductId(conn, productId) {
  await syncProductStockFromVariants(conn, productId);
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
       COALESCE((
         SELECT NULLIF(GROUP_CONCAT(psv.value ORDER BY psg.sort_order ASC, psv.sort_order ASC SEPARATOR ' / '), '')
         FROM product_variant_spec_values pvsv
         JOIN product_spec_groups psg ON psg.id = pvsv.group_id AND psg.deleted_at IS NULL
         JOIN product_spec_values psv ON psv.id = pvsv.value_id AND psv.deleted_at IS NULL
         WHERE pvsv.variant_id = v.id
       ), v.title, '') AS spec_text,
       v.sku_code,
       v.barcode,
       v.price,
       v.cost_price,
       v.enabled,
       v.stock,
       COALESCE(v.unit_name, '件') AS unit_name,
       v.reserved_stock,
       (v.stock - COALESCE(v.reserved_stock,0)) AS available_stock,
       v.stock_warning_threshold,
       ((v.stock - COALESCE(v.reserved_stock,0)) <= COALESCE(v.stock_lower_limit, v.stock_warning_threshold,5)) AS low_stock,
       ((v.stock - COALESCE(v.reserved_stock,0)) <= 0) AS out_of_stock,
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
       v.cost_price,
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

async function selectVariantDetailForUpdate(conn, variantId) {
  const [[row]] = await conn.query(
    `SELECT
       v.id,
       v.product_id,
       v.title,
       v.sku_code,
       v.stock,
       COALESCE(v.reserved_stock, 0) AS reserved_stock,
       v.cost_price,
       COALESCE(v.unit_name, '件') AS unit_name,
       v.enabled,
       v.deleted_at,
       p.name AS product_name,
       p.deleted_at AS product_deleted_at
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id = ?
     FOR UPDATE`,
    [variantId],
  );
  return row || null;
}

async function selectVariantsDetailsForUpdate(conn, variantIds) {
  const ids = [...new Set((variantIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await conn.query(
    `SELECT
       v.id,
       v.product_id,
       v.title,
       v.sku_code,
       v.stock,
       COALESCE(v.unit_name, '件') AS unit_name,
       v.enabled,
       v.deleted_at,
       p.name AS product_name,
       p.deleted_at AS product_deleted_at
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id IN (${ids.map(() => '?').join(',')})
     ORDER BY v.id ASC
     FOR UPDATE`,
    ids,
  );
  return rows;
}

async function updateVariantStock(conn, variantId, stock) {
  await conn.query('UPDATE product_variants SET stock = ? WHERE id = ?', [stock, variantId]);
}

async function updateVariantCostPrice(conn, variantId, costPrice) {
  await conn.query('UPDATE product_variants SET cost_price = ? WHERE id = ?', [costPrice, variantId]);
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

async function selectVariantLimitSnapshots(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return [];
  const [rows] = await db.query(
    `SELECT id, product_id, title, sku_code, stock_warning_threshold, stock_lower_limit, stock_upper_limit
     FROM product_variants
     WHERE id IN (${uniqueIds.map(() => '?').join(',')})`,
    uniqueIds,
  );
  return rows;
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
       COALESCE((
         SELECT NULLIF(GROUP_CONCAT(psv.value ORDER BY psg.sort_order ASC, psv.sort_order ASC SEPARATOR ' / '), '')
         FROM product_variant_spec_values pvsv
         JOIN product_spec_groups psg ON psg.id = pvsv.group_id AND psg.deleted_at IS NULL
         JOIN product_spec_values psv ON psv.id = pvsv.value_id AND psv.deleted_at IS NULL
         WHERE pvsv.variant_id = v.id
       ), v.title, '') AS spec_text,
       v.sku_code,
       v.barcode,
       v.price,
       v.cost_price,
       v.enabled,
       v.stock,
       COALESCE(v.unit_name, '件') AS unit_name,
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

async function countPackRules(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM inventory_pack_rules r
     JOIN product_variants pv ON pv.id = r.parent_variant_id
     JOIN products pp ON pp.id = r.parent_product_id
     JOIN product_variants cv ON cv.id = r.child_variant_id
     JOIN products cp ON cp.id = r.child_product_id
     ${where}`,
    params,
  );
  return total;
}

async function selectPackRulesPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
       r.*,
       pp.name AS parent_product_name,
       pv.title AS parent_variant_name,
       pv.sku_code AS parent_sku_code,
       COALESCE(pv.unit_name, '件') AS parent_unit_name,
       pv.stock AS parent_stock,
       COALESCE(pv.reserved_stock, 0) AS parent_reserved_stock,
       GREATEST(COALESCE(pv.stock, 0) - COALESCE(pv.reserved_stock, 0), 0) AS parent_available_stock,
       cp.name AS child_product_name,
       cv.title AS child_variant_name,
       cv.sku_code AS child_sku_code,
       COALESCE(cv.unit_name, '件') AS child_unit_name,
       cv.stock AS child_stock,
       COALESCE(cv.reserved_stock, 0) AS child_reserved_stock,
       GREATEST(COALESCE(cv.stock, 0) - COALESCE(cv.reserved_stock, 0), 0) AS child_available_stock,
       u.nickname AS updated_by_name
     FROM inventory_pack_rules r
     JOIN product_variants pv ON pv.id = r.parent_variant_id
     JOIN products pp ON pp.id = r.parent_product_id
     JOIN product_variants cv ON cv.id = r.child_variant_id
     JOIN products cp ON cp.id = r.child_product_id
     LEFT JOIN users u ON u.id = r.updated_by
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectPackRuleByIdForUpdate(conn, id) {
  const [[row]] = await conn.query(
    `SELECT * FROM inventory_pack_rules WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return row || null;
}

async function selectPackRuleById(id) {
  const [[row]] = await db.query(
    `SELECT
       r.*,
       pp.name AS parent_product_name,
       pv.title AS parent_variant_name,
       pv.sku_code AS parent_sku_code,
       COALESCE(pv.unit_name, '件') AS parent_unit_name,
       pv.stock AS parent_stock,
       COALESCE(pv.reserved_stock, 0) AS parent_reserved_stock,
       GREATEST(COALESCE(pv.stock, 0) - COALESCE(pv.reserved_stock, 0), 0) AS parent_available_stock,
       cp.name AS child_product_name,
       cv.title AS child_variant_name,
       cv.sku_code AS child_sku_code,
       COALESCE(cv.unit_name, '件') AS child_unit_name,
       cv.stock AS child_stock,
       COALESCE(cv.reserved_stock, 0) AS child_reserved_stock,
       GREATEST(COALESCE(cv.stock, 0) - COALESCE(cv.reserved_stock, 0), 0) AS child_available_stock
     FROM inventory_pack_rules r
     JOIN product_variants pv ON pv.id = r.parent_variant_id
     JOIN products pp ON pp.id = r.parent_product_id
     JOIN product_variants cv ON cv.id = r.child_variant_id
     JOIN products cp ON cp.id = r.child_product_id
     WHERE r.id = ? AND r.deleted_at IS NULL`,
    [id],
  );
  return row || null;
}

async function countActivePackRulePair(conn, parentVariantId, childVariantId, excludeId) {
  const params = [parentVariantId, childVariantId];
  let sql = `SELECT COUNT(*) AS total FROM inventory_pack_rules
             WHERE parent_variant_id = ? AND child_variant_id = ? AND deleted_at IS NULL`;
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  const [[row]] = await conn.query(sql, params);
  return Number(row.total || 0);
}

async function countReversePackRule(conn, parentVariantId, childVariantId, excludeId) {
  const params = [childVariantId, parentVariantId];
  let sql = `SELECT COUNT(*) AS total FROM inventory_pack_rules
             WHERE parent_variant_id = ? AND child_variant_id = ? AND deleted_at IS NULL`;
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  const [[row]] = await conn.query(sql, params);
  return Number(row.total || 0);
}

async function selectActivePackRuleEdges(conn, excludeId) {
  const params = [];
  let sql = `SELECT parent_variant_id, child_variant_id FROM inventory_pack_rules WHERE deleted_at IS NULL`;
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function countEnabledAutoRulesForChild(conn, childVariantId, excludeId) {
  const params = [childVariantId];
  let sql = `SELECT COUNT(*) AS total
             FROM inventory_pack_rules
             WHERE child_variant_id = ?
               AND enabled = 1
               AND auto_unpack_enabled = 1
               AND deleted_at IS NULL`;
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  const [[row]] = await conn.query(sql, params);
  return Number(row.total || 0);
}

async function insertPackRule(conn, row) {
  await conn.query(
    `INSERT INTO inventory_pack_rules
       (id, parent_product_id, parent_variant_id, child_product_id, child_variant_id,
        parent_qty, child_qty, auto_unpack_enabled, manual_unpack_enabled,
        manual_assemble_enabled, enabled, remark, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.parent_product_id,
      row.parent_variant_id,
      row.child_product_id,
      row.child_variant_id,
      row.parent_qty,
      row.child_qty,
      row.auto_unpack_enabled,
      row.manual_unpack_enabled,
      row.manual_assemble_enabled,
      row.enabled,
      row.remark || '',
      row.created_by || null,
      row.updated_by || null,
    ],
  );
}

async function updatePackRule(conn, id, row) {
  await conn.query(
    `UPDATE inventory_pack_rules
        SET parent_product_id = ?,
            parent_variant_id = ?,
            child_product_id = ?,
            child_variant_id = ?,
            parent_qty = ?,
            child_qty = ?,
            auto_unpack_enabled = ?,
            manual_unpack_enabled = ?,
            manual_assemble_enabled = ?,
            enabled = ?,
            remark = ?,
            updated_by = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [
      row.parent_product_id,
      row.parent_variant_id,
      row.child_product_id,
      row.child_variant_id,
      row.parent_qty,
      row.child_qty,
      row.auto_unpack_enabled,
      row.manual_unpack_enabled,
      row.manual_assemble_enabled,
      row.enabled,
      row.remark || '',
      row.updated_by || null,
      id,
    ],
  );
}

async function softDeletePackRule(conn, id, adminUserId) {
  const [result] = await conn.query(
    `UPDATE inventory_pack_rules
        SET deleted_at = NOW(), updated_by = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [adminUserId || null, id],
  );
  return result.affectedRows || 0;
}

async function insertConversionOrder(conn, row) {
  await conn.query(
    `INSERT INTO inventory_conversion_orders
       (id, order_no, type, rule_id,
        parent_product_id, parent_variant_id, parent_qty,
        child_product_id, child_variant_id, rule_parent_qty, child_qty_per_parent, child_total_qty,
        parent_before_stock, parent_after_stock, child_before_stock, child_after_stock,
        parent_cost_before, parent_cost_after, child_cost_before, child_cost_after, cost_allocation_method,
        parent_product_name_snapshot, parent_variant_name_snapshot, parent_sku_code_snapshot, parent_unit_name_snapshot,
        child_product_name_snapshot, child_variant_name_snapshot, child_sku_code_snapshot, child_unit_name_snapshot,
        source_type, source_order_id, source_order_no, operator_id, remark)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.order_no,
      row.type,
      row.rule_id,
      row.parent_product_id,
      row.parent_variant_id,
      row.parent_qty,
      row.child_product_id,
      row.child_variant_id,
      row.rule_parent_qty,
      row.child_qty_per_parent,
      row.child_total_qty,
      row.parent_before_stock,
      row.parent_after_stock,
      row.child_before_stock,
      row.child_after_stock,
      row.parent_cost_before ?? null,
      row.parent_cost_after ?? null,
      row.child_cost_before ?? null,
      row.child_cost_after ?? null,
      row.cost_allocation_method || null,
      row.parent_product_name_snapshot || '',
      row.parent_variant_name_snapshot || '',
      row.parent_sku_code_snapshot || '',
      row.parent_unit_name_snapshot || '件',
      row.child_product_name_snapshot || '',
      row.child_variant_name_snapshot || '',
      row.child_sku_code_snapshot || '',
      row.child_unit_name_snapshot || '件',
      row.source_type || 'manual',
      row.source_order_id || null,
      row.source_order_no || '',
      row.operator_id || null,
      row.remark || '',
    ],
  );
}

async function countConversionOrders(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM inventory_conversion_orders o ${where}`,
    params,
  );
  return total;
}

async function selectConversionOrdersPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT o.*, u.nickname AS operator_name
       FROM inventory_conversion_orders o
       LEFT JOIN users u ON u.id = o.operator_id
       ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectConversionOrderById(id) {
  const [[row]] = await db.query(
    `SELECT o.*, u.nickname AS operator_name
       FROM inventory_conversion_orders o
       LEFT JOIN users u ON u.id = o.operator_id
      WHERE o.id = ?`,
    [id],
  );
  return row || null;
}

module.exports = {
  getPool,
  getConnection,
  syncProductStockByProductId,
  selectInventorySummary,
  countSkus,
  selectSkusPage,
  selectVariantForUpdate,
  selectVariantDetailForUpdate,
  selectVariantsDetailsForUpdate,
  updateVariantStock,
  updateVariantCostPrice,
  updateVariantWarningThreshold,
  batchUpdateVariantWarningThreshold,
  selectVariantLimitSnapshots,
  selectProductVariants,
  selectProductById,
  insertStockRecord,
  countStockRecords,
  selectStockRecordsPage,
  selectSkuExportRows,
  countPackRules,
  selectPackRulesPage,
  selectPackRuleByIdForUpdate,
  selectPackRuleById,
  countActivePackRulePair,
  countReversePackRule,
  selectActivePackRuleEdges,
  countEnabledAutoRulesForChild,
  insertPackRule,
  updatePackRule,
  softDeletePackRule,
  insertConversionOrder,
  countConversionOrders,
  selectConversionOrdersPage,
  selectConversionOrderById,
};


