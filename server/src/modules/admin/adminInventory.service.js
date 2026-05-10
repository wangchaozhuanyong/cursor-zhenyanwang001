const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const { writeAuditLog } = require('../../utils/auditLog');
const repo = require('./adminInventory.repository');

const CHANGE_TYPES = new Set(['in', 'out', 'adjust']);

function buildProductWhere(query) {
  let where = 'WHERE p.deleted_at IS NULL';
  const params = [];
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ' AND p.name LIKE ?';
    params.push(`%${keyword}%`);
  }
  if (query.lowStock === '1' || query.lowStock === 'true' || query.lowStock === true) {
    where += ' AND p.stock <= COALESCE(p.stock_warning_threshold, 5)';
  }
  return { where, params };
}

function buildRecordWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];
  if (query.product_id) {
    where += ' AND r.product_id = ?';
    params.push(query.product_id);
  }
  if (query.change_type) {
    where += ' AND r.change_type = ?';
    params.push(query.change_type);
  }
  return { where, params };
}

function formatProduct(row) {
  const threshold = Number(row.stock_warning_threshold ?? 5);
  const stock = Number(row.stock ?? 0);
  return {
    id: row.id,
    name: row.name,
    cover_image: row.cover_image || '',
    category_name: row.category_name || '',
    stock,
    default_variant_id: row.default_variant_id || null,
    default_variant_stock: row.default_variant_stock != null ? Number(row.default_variant_stock) : stock,
    stock_warning_threshold: threshold,
    low_stock: stock <= threshold,
    status: row.status,
    lifecycle_status: row.lifecycle_status,
    updated_at: row.updated_at,
  };
}

function formatRecord(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    product_image: row.product_image || '',
    variant_id: row.variant_id || null,
    change_type: row.change_type,
    quantity_delta: Number(row.quantity_delta),
    before_stock: Number(row.before_stock),
    after_stock: Number(row.after_stock),
    reason: row.reason || '',
    ref_type: row.ref_type || '',
    ref_id: row.ref_id || '',
    operator_id: row.operator_id || null,
    operator_name: row.operator_name || '',
    created_at: row.created_at,
  };
}

async function listInventoryProducts(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildProductWhere(query);
  const total = await repo.countProducts(where, params);
  const rows = await repo.selectProductsPage(where, params, pageSize, (page - 1) * pageSize);
  return { kind: 'paginate', list: rows.map(formatProduct), total, page, pageSize };
}

async function adjustStock(productId, body, adminUserId, req) {
  const changeType = String(body.change_type || '').trim();
  if (!CHANGE_TYPES.has(changeType)) throw new BusinessError(400, '库存变动类型无效');

  const rawQty = Number(body.quantity);
  if (!Number.isInteger(rawQty) || rawQty <= 0) throw new BusinessError(400, '数量必须为正整数');

  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const product = await repo.selectProductForUpdate(conn, productId);
    if (!product) throw new BusinessError(404, '商品不存在');

    const beforeStock = Number(product.stock || 0);
    let afterStock;
    let delta;
    if (changeType === 'in') {
      delta = rawQty;
      afterStock = beforeStock + rawQty;
    } else if (changeType === 'out') {
      delta = -rawQty;
      afterStock = beforeStock - rawQty;
      if (afterStock < 0) throw new BusinessError(400, `库存不足，当前库存 ${beforeStock}`);
    } else {
      afterStock = rawQty;
      delta = afterStock - beforeStock;
    }

    await repo.updateProductStock(conn, productId, afterStock);
    await repo.insertStockRecord(conn, {
      id: generateId(),
      productId,
      variantId: product.default_variant_id || null,
      changeType,
      quantityDelta: delta,
      beforeStock,
      afterStock,
      reason: body.reason || '',
      refType: 'admin',
      refId: '',
      operatorId: adminUserId,
    });
    await conn.commit();

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.adjust',
      objectType: 'product',
      objectId: productId,
      summary: `库存${changeType} ${product.name}`,
      before: { stock: beforeStock },
      after: { stock: afterStock, delta, reason: body.reason || '' },
      result: 'success',
    });

    return { data: { product_id: productId, before_stock: beforeStock, after_stock: afterStock, quantity_delta: delta }, message: '库存已更新' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateWarningThreshold(productId, body, adminUserId, req) {
  const threshold = Number(body.stock_warning_threshold);
  if (!Number.isInteger(threshold) || threshold < 0) throw new BusinessError(400, '预警阈值必须为非负整数');
  await repo.updateProductWarningThreshold(productId, threshold);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'inventory.warning_update',
    objectType: 'product',
    objectId: productId,
    summary: `更新库存预警阈值 ${productId}`,
    after: { stock_warning_threshold: threshold },
    result: 'success',
  });
  return { data: null, message: '预警阈值已更新' };
}

async function listStockRecords(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildRecordWhere(query);
  const total = await repo.countStockRecords(where, params);
  const rows = await repo.selectStockRecordsPage(where, params, pageSize, (page - 1) * pageSize);
  return { kind: 'paginate', list: rows.map(formatRecord), total, page, pageSize };
}

module.exports = {
  listInventoryProducts,
  adjustStock,
  updateWarningThreshold,
  listStockRecords,
};
