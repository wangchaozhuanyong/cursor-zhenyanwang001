const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const { writeAuditLog } = require('../../utils/auditLog');
const { rowsToCsv } = require('../../utils/csv');
const repo = require('./adminInventory.repository');

const CHANGE_TYPES = new Set(['in', 'out', 'adjust']);

function parseBool(v) {
  return v === true || v === 'true' || v === '1' || v === 1;
}

function buildSkuWhere(query) {
  let where = 'WHERE p.deleted_at IS NULL AND v.deleted_at IS NULL';
  const params = [];
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ' AND (p.name LIKE ? OR v.title LIKE ? OR v.sku_code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (query.category_id) {
    where += ' AND p.category_id = ?';
    params.push(query.category_id);
  }
  if (query.lifecycle_status !== undefined && query.lifecycle_status !== '') {
    where += ' AND p.lifecycle_status = ?';
    params.push(Number(query.lifecycle_status));
  }
  if (query.sku_code) {
    where += ' AND v.sku_code LIKE ?';
    params.push(`%${String(query.sku_code).trim()}%`);
  }
  const stockStatus = String(query.stock_status || '').trim();
  if (stockStatus === 'low') {
    where += ' AND v.stock > 0 AND v.stock <= COALESCE(v.stock_warning_threshold,5)';
  } else if (stockStatus === 'out') {
    where += ' AND v.stock <= 0';
  } else if (stockStatus === 'normal') {
    where += ' AND v.stock > COALESCE(v.stock_warning_threshold,5)';
  }
  if (parseBool(query.lowStock)) {
    where += ' AND v.stock <= COALESCE(v.stock_warning_threshold,5)';
  }
  return { where, params };
}

function buildSortSql(sort) {
  switch (String(sort || 'updated_desc')) {
    case 'stock_asc': return 'ORDER BY v.stock ASC, v.updated_at DESC';
    case 'stock_desc': return 'ORDER BY v.stock DESC, v.updated_at DESC';
    case 'warning_asc': return 'ORDER BY v.stock_warning_threshold ASC, v.updated_at DESC';
    case 'updated_asc': return 'ORDER BY v.updated_at ASC';
    default: return 'ORDER BY v.updated_at DESC';
  }
}

function buildRecordWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];
  if (query.product_id) {
    where += ' AND r.product_id = ?';
    params.push(query.product_id);
  }
  if (query.variant_id) {
    where += ' AND r.variant_id = ?';
    params.push(query.variant_id);
  }
  if (query.change_type) {
    where += ' AND r.change_type = ?';
    params.push(query.change_type);
  }
  if (query.operator_id) {
    where += ' AND r.operator_id = ?';
    params.push(query.operator_id);
  }
  if (query.source_no) {
    where += ' AND r.source_no LIKE ?';
    params.push(`%${String(query.source_no).trim()}%`);
  }
  if (query.order_no) {
    where += ' AND r.order_no_snapshot LIKE ?';
    params.push(`%${String(query.order_no).trim()}%`);
  }
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ' AND ((r.product_name_snapshot LIKE ?) OR (r.variant_name_snapshot LIKE ?) OR (r.sku_code_snapshot LIKE ?) OR (r.reason LIKE ?) OR (r.remark LIKE ?))';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (query.date_from) {
    where += ' AND r.created_at >= ?';
    params.push(`${query.date_from} 00:00:00`);
  }
  if (query.date_to) {
    where += ' AND r.created_at <= ?';
    params.push(`${query.date_to} 23:59:59`);
  }
  return { where, params };
}

function formatSku(row) {
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    cover_image: row.cover_image || '',
    category_name: row.category_name || '',
    lifecycle_status: row.lifecycle_status,
    variant_id: row.variant_id,
    variant_title: row.variant_title || '',
    sku_code: row.sku_code || '',
    stock: Number(row.stock || 0),
    reserved_stock: Number(row.reserved_stock || 0),
    available_stock: Number(row.available_stock || 0),
    stock_warning_threshold: Number(row.stock_warning_threshold || 0),
    low_stock: !!row.low_stock,
    out_of_stock: !!row.out_of_stock,
    updated_at: row.updated_at,
  };
}

function formatRecord(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name_snapshot || row.product_name || '',
    product_image: row.product_image || '',
    variant_id: row.variant_id || null,
    variant_name: row.variant_name_snapshot || row.variant_title || '',
    sku_code: row.sku_code_snapshot || row.variant_sku_code || '',
    change_type: row.change_type,
    quantity_delta: Number(row.quantity_delta),
    before_stock: Number(row.before_stock),
    after_stock: Number(row.after_stock),
    reason: row.reason || '',
    remark: row.remark || '',
    source_no: row.source_no || '',
    ref_type: row.ref_type || '',
    ref_id: row.ref_id || '',
    order_no: row.order_no_snapshot || row.order_no || '',
    operator_id: row.operator_id || null,
    operator_name: row.operator_name || '',
    created_at: row.created_at,
  };
}

async function getSummary() {
  const row = await repo.selectInventorySummary();
  return {
    data: {
      total_products: Number(row.total_products || 0),
      total_skus: Number(row.total_skus || 0),
      total_stock: Number(row.total_stock || 0),
      low_stock_skus: Number(row.low_stock_skus || 0),
      out_of_stock_skus: Number(row.out_of_stock_skus || 0),
      today_in_qty: Number(row.today_in_qty || 0),
      today_out_qty: Number(row.today_out_qty || 0),
      today_order_deduct_qty: Number(row.today_order_deduct_qty || 0),
    },
  };
}

async function listSkus(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildSkuWhere(query);
  const sortSql = buildSortSql(query.sort);
  const total = await repo.countSkus(where, params);
  const rows = await repo.selectSkusPage(where, params, sortSql, pageSize, (page - 1) * pageSize);
  return { kind: 'paginate', list: rows.map(formatSku), total, page, pageSize };
}

async function adjustSkuStock(variantId, body, adminUserId, req) {
  const changeType = String(body.change_type || '').trim();
  if (!CHANGE_TYPES.has(changeType)) throw new BusinessError(400, '库存变动类型无效');
  const qty = Number(body.quantity);
  if (!Number.isInteger(qty)) throw new BusinessError(400, '数量必须为整数');
  if (changeType === 'adjust') {
    if (qty < 0) throw new BusinessError(400, '盘点后的库存必须大于等于 0');
  } else if (qty <= 0) {
    throw new BusinessError(400, '数量必须大于 0');
  }

  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const sku = await repo.selectVariantForUpdate(conn, variantId);
    if (!sku) throw new BusinessError(404, 'SKU 不存在');

    const beforeStock = Number(sku.stock || 0);
    let afterStock = beforeStock;
    let delta = 0;
    if (changeType === 'in') {
      delta = qty;
      afterStock = beforeStock + qty;
    } else if (changeType === 'out') {
      if (qty > beforeStock) throw new BusinessError(400, `库存不足，当前库存 ${beforeStock}`);
      delta = -qty;
      afterStock = beforeStock - qty;
    } else {
      afterStock = qty;
      delta = afterStock - beforeStock;
    }

    await repo.updateVariantStock(conn, variantId, afterStock);
    await repo.syncProductStockByProductId(conn, sku.product_id);

    await repo.insertStockRecord(conn, {
      id: generateId(),
      productId: sku.product_id,
      variantId,
      changeType,
      quantityDelta: delta,
      beforeStock,
      afterStock,
      reason: String(body.reason || '').trim(),
      refType: 'admin',
      refId: '',
      operatorId: adminUserId,
      productNameSnapshot: sku.product_name,
      variantNameSnapshot: sku.title || '',
      skuCodeSnapshot: sku.sku_code || '',
      orderNoSnapshot: '',
      sourceNo: body.source_no || '',
      remark: body.remark || '',
      costPrice: body.cost_price,
      createdByType: 'admin',
    });

    await conn.commit();

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.adjust',
      objectType: 'product_variant',
      objectId: variantId,
      summary: `SKU库存${changeType} ${sku.product_name} / ${sku.title || sku.sku_code || variantId}`,
      before: { stock: beforeStock },
      after: { stock: afterStock, delta, reason: body.reason || '', source_no: body.source_no || '' },
      result: 'success',
    });

    return {
      data: {
        product_id: sku.product_id,
        variant_id: variantId,
        before_stock: beforeStock,
        after_stock: afterStock,
        quantity_delta: delta,
      },
      message: '库存已更新',
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function adjustProductStockCompat(productId, body, adminUserId, req) {
  const variants = await repo.selectProductVariants(productId);
  if (!variants.length) throw new BusinessError(404, '商品不存在或没有可用SKU');
  if (variants.length > 1) throw new BusinessError(400, '该商品存在多个规格，请选择具体 SKU 调整库存');
  return adjustSkuStock(variants[0].id, body, adminUserId, req);
}

async function updateSkuWarningThreshold(variantId, body, adminUserId, req) {
  const threshold = Number(body.stock_warning_threshold);
  if (!Number.isInteger(threshold) || threshold < 0) throw new BusinessError(400, '预警阈值必须为非负整数');
  await repo.updateVariantWarningThreshold(variantId, threshold);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'inventory.warning_update',
    objectType: 'product_variant',
    objectId: variantId,
    summary: `更新SKU库存预警阈值 ${variantId}`,
    after: { stock_warning_threshold: threshold },
    result: 'success',
  });
  return { data: null, message: '预警阈值已更新' };
}

async function batchWarningThreshold(body) {
  const ids = Array.isArray(body.variant_ids) ? body.variant_ids.filter(Boolean) : [];
  const threshold = Number(body.stock_warning_threshold);
  if (!ids.length) throw new BusinessError(400, 'variant_ids 不能为空');
  if (!Number.isInteger(threshold) || threshold < 0) throw new BusinessError(400, '预警阈值必须为非负整数');
  const pool = repo.getPool();
  await pool.query(
    `UPDATE product_variants SET stock_warning_threshold = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
    [threshold, ...ids],
  );
  return { data: { updated: ids.length }, message: '批量预警值已更新' };
}

async function batchAdjust(body, adminUserId, req) {
  const rows = Array.isArray(body.items) ? body.items : [];
  if (!rows.length) throw new BusinessError(400, 'items 不能为空');
  let updated = 0;
  for (const row of rows) {
    await adjustSkuStock(row.variant_id, {
      change_type: row.change_type,
      quantity: row.quantity,
      reason: row.reason,
      remark: row.remark,
      source_no: row.source_no,
      cost_price: row.cost_price,
    }, adminUserId, req);
    updated += 1;
  }
  return { data: { updated }, message: '批量库存调整完成' };
}

async function listStockRecords(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildRecordWhere(query);
  const total = await repo.countStockRecords(where, params);
  const rows = await repo.selectStockRecordsPage(where, params, pageSize, (page - 1) * pageSize);
  return { kind: 'paginate', list: rows.map(formatRecord), total, page, pageSize };
}

async function exportSkusCsv(query) {
  const { where, params } = buildSkuWhere(query);
  const rows = await repo.selectSkuExportRows(where, params, buildSortSql(query.sort));
  const csv = rowsToCsv([
    'product_id', 'product_name', 'variant_id', 'variant_title', 'sku_code', 'category_name', 'lifecycle_status',
    'stock', 'reserved_stock', 'available_stock', 'stock_warning_threshold', 'updated_at',
  ], rows.map((r) => ({
    product_id: r.product_id,
    product_name: r.product_name,
    variant_id: r.variant_id,
    variant_title: r.variant_title || '',
    sku_code: r.sku_code || '',
    category_name: r.category_name || '',
    lifecycle_status: r.lifecycle_status,
    stock: Number(r.stock || 0),
    reserved_stock: Number(r.reserved_stock || 0),
    available_stock: Number(r.available_stock || 0),
    stock_warning_threshold: Number(r.stock_warning_threshold || 0),
    updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : '',
  })));
  return { csv, filename: `inventory_skus_${Date.now()}.csv` };
}

async function exportRecordsCsv(query) {
  const { where, params } = buildRecordWhere(query);
  const rows = await repo.selectStockRecordsPage(where, params, 50000, 0);
  const csv = rowsToCsv([
    'created_at', 'product_name', 'variant_name', 'sku_code', 'change_type', 'quantity_delta', 'before_stock',
    'after_stock', 'reason', 'remark', 'source_no', 'order_no', 'operator_name',
  ], rows.map((r) => ({
    created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
    product_name: r.product_name_snapshot || r.product_name || '',
    variant_name: r.variant_name_snapshot || r.variant_title || '',
    sku_code: r.sku_code_snapshot || r.variant_sku_code || '',
    change_type: r.change_type,
    quantity_delta: Number(r.quantity_delta || 0),
    before_stock: Number(r.before_stock || 0),
    after_stock: Number(r.after_stock || 0),
    reason: r.reason || '',
    remark: r.remark || '',
    source_no: r.source_no || '',
    order_no: r.order_no_snapshot || r.order_no || '',
    operator_name: r.operator_name || r.operator_id || '',
  })));
  return { csv, filename: `inventory_records_${Date.now()}.csv` };
}

module.exports = {
  getSummary,
  listSkus,
  adjustSkuStock,
  adjustProductStockCompat,
  updateSkuWarningThreshold,
  batchWarningThreshold,
  batchAdjust,
  listStockRecords,
  exportSkusCsv,
  exportRecordsCsv,
};

