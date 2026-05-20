const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { writeAuditLog } = require('../../../utils/auditLog');
const { rowsToCsvLocalized, labelInventoryChangeType } = require('../../../utils/adminCsvLabels');
const repo = require('../repository/adminInventory.repository');

const CHANGE_TYPES = new Set(['in', 'out', 'adjust']);

function parseBool(v) {
  return v === true || v === 'true' || v === '1' || v === 1;
}

function boolToInt(v, defaultValue = false) {
  if (v === undefined || v === null || v === '') return defaultValue ? 1 : 0;
  return parseBool(v) ? 1 : 0;
}

function createConversionOrderNo(prefix = 'ZH') {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${y}${m}${d}${Date.now().toString().slice(-6)}${rand}`;
}

function buildSkuWhere(query) {
  let where = 'WHERE p.deleted_at IS NULL AND v.deleted_at IS NULL';
  const params = [];
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ` AND (
      p.name LIKE ?
      OR v.title LIKE ?
      OR v.sku_code LIKE ?
      OR v.barcode LIKE ?
      OR EXISTS (
        SELECT 1
        FROM product_variant_spec_values pvsv
        JOIN product_spec_values psv ON psv.id = pvsv.value_id AND psv.deleted_at IS NULL
        WHERE pvsv.variant_id = v.id AND psv.value LIKE ?
      )
    )`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
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
    spec_text: row.spec_text || row.variant_title || '',
    sku_code: row.sku_code || '',
    barcode: row.barcode || '',
    price: Number(row.price || 0),
    cost_price: row.cost_price == null ? null : Number(row.cost_price),
    enabled: row.enabled !== undefined ? !!row.enabled : true,
    stock: Number(row.stock || 0),
    unit_name: row.unit_name || '件',
    reserved_stock: Number(row.reserved_stock || 0),
    available_stock: Number(row.available_stock || 0),
    stock_warning_threshold: Number(row.stock_warning_threshold || 0),
    low_stock: !!row.low_stock,
    out_of_stock: !!row.out_of_stock,
    updated_at: row.updated_at,
  };
}

function buildPackRuleWhere(query) {
  let where = 'WHERE r.deleted_at IS NULL';
  const params = [];
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ` AND (
      pp.name LIKE ? OR pv.title LIKE ? OR pv.sku_code LIKE ?
      OR cp.name LIKE ? OR cv.title LIKE ? OR cv.sku_code LIKE ?
      OR r.remark LIKE ?
    )`;
    params.push(...Array(7).fill(`%${keyword}%`));
  }
  if (query.parent_variant_id) {
    where += ' AND r.parent_variant_id = ?';
    params.push(query.parent_variant_id);
  }
  if (query.child_variant_id) {
    where += ' AND r.child_variant_id = ?';
    params.push(query.child_variant_id);
  }
  if (query.enabled !== undefined && query.enabled !== '') {
    where += ' AND r.enabled = ?';
    params.push(parseBool(query.enabled) ? 1 : 0);
  }
  if (query.auto_unpack_enabled !== undefined && query.auto_unpack_enabled !== '') {
    where += ' AND r.auto_unpack_enabled = ?';
    params.push(parseBool(query.auto_unpack_enabled) ? 1 : 0);
  }
  return { where, params };
}

function buildConversionWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ` AND (
      o.order_no LIKE ? OR o.parent_product_name_snapshot LIKE ? OR o.parent_variant_name_snapshot LIKE ?
      OR o.parent_sku_code_snapshot LIKE ? OR o.child_product_name_snapshot LIKE ?
      OR o.child_variant_name_snapshot LIKE ? OR o.child_sku_code_snapshot LIKE ?
      OR o.source_order_no LIKE ? OR o.remark LIKE ?
    )`;
    params.push(...Array(9).fill(`%${keyword}%`));
  }
  if (query.type) {
    where += ' AND o.type = ?';
    params.push(query.type);
  }
  if (query.order_no) {
    where += ' AND o.order_no LIKE ?';
    params.push(`%${String(query.order_no).trim()}%`);
  }
  if (query.source_order_no) {
    where += ' AND o.source_order_no LIKE ?';
    params.push(`%${String(query.source_order_no).trim()}%`);
  }
  if (query.parent_variant_id) {
    where += ' AND o.parent_variant_id = ?';
    params.push(query.parent_variant_id);
  }
  if (query.child_variant_id) {
    where += ' AND o.child_variant_id = ?';
    params.push(query.child_variant_id);
  }
  if (query.operator_id) {
    where += ' AND o.operator_id = ?';
    params.push(query.operator_id);
  }
  if (query.date_from) {
    where += ' AND o.created_at >= ?';
    params.push(`${query.date_from} 00:00:00`);
  }
  if (query.date_to) {
    where += ' AND o.created_at <= ?';
    params.push(`${query.date_to} 23:59:59`);
  }
  return { where, params };
}

function formatPackRule(row) {
  return {
    id: row.id,
    parent_product_id: row.parent_product_id,
    parent_variant_id: row.parent_variant_id,
    child_product_id: row.child_product_id,
    child_variant_id: row.child_variant_id,
    parent_qty: Number(row.parent_qty || 1),
    child_qty: Number(row.child_qty || 0),
    auto_unpack_enabled: !!row.auto_unpack_enabled,
    manual_unpack_enabled: !!row.manual_unpack_enabled,
    manual_assemble_enabled: !!row.manual_assemble_enabled,
    enabled: !!row.enabled,
    remark: row.remark || '',
    parent_product_name: row.parent_product_name || '',
    parent_variant_name: row.parent_variant_name || '',
    parent_sku_code: row.parent_sku_code || '',
    parent_unit_name: row.parent_unit_name || '件',
    parent_stock: Number(row.parent_stock || 0),
    child_product_name: row.child_product_name || '',
    child_variant_name: row.child_variant_name || '',
    child_sku_code: row.child_sku_code || '',
    child_unit_name: row.child_unit_name || '件',
    child_stock: Number(row.child_stock || 0),
    updated_by_name: row.updated_by_name || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatConversionOrder(row) {
  return {
    id: row.id,
    order_no: row.order_no,
    type: row.type,
    rule_id: row.rule_id,
    parent_product_id: row.parent_product_id,
    parent_variant_id: row.parent_variant_id,
    parent_qty: Number(row.parent_qty || 0),
    child_product_id: row.child_product_id,
    child_variant_id: row.child_variant_id,
    rule_parent_qty: Number(row.rule_parent_qty || 1),
    child_qty_per_parent: Number(row.child_qty_per_parent || 0),
    child_total_qty: Number(row.child_total_qty || 0),
    parent_before_stock: Number(row.parent_before_stock || 0),
    parent_after_stock: Number(row.parent_after_stock || 0),
    child_before_stock: Number(row.child_before_stock || 0),
    child_after_stock: Number(row.child_after_stock || 0),
    parent_product_name_snapshot: row.parent_product_name_snapshot || '',
    parent_variant_name_snapshot: row.parent_variant_name_snapshot || '',
    parent_sku_code_snapshot: row.parent_sku_code_snapshot || '',
    parent_unit_name_snapshot: row.parent_unit_name_snapshot || '件',
    child_product_name_snapshot: row.child_product_name_snapshot || '',
    child_variant_name_snapshot: row.child_variant_name_snapshot || '',
    child_sku_code_snapshot: row.child_sku_code_snapshot || '',
    child_unit_name_snapshot: row.child_unit_name_snapshot || '件',
    source_type: row.source_type || 'manual',
    source_order_id: row.source_order_id || null,
    source_order_no: row.source_order_no || '',
    operator_id: row.operator_id || null,
    operator_name: row.operator_name || '',
    remark: row.remark || '',
    created_at: row.created_at,
  };
}

function normalizePackRuleInput(body, fallback = {}) {
  const parentVariantId = String(body.parent_variant_id ?? fallback.parent_variant_id ?? '').trim();
  const childVariantId = String(body.child_variant_id ?? fallback.child_variant_id ?? '').trim();
  const parentQty = Number(body.parent_qty ?? fallback.parent_qty ?? 1);
  const childQty = Number(body.child_qty ?? fallback.child_qty);
  return {
    parent_variant_id: parentVariantId,
    child_variant_id: childVariantId,
    parent_qty: parentQty,
    child_qty: childQty,
    auto_unpack_enabled: boolToInt(body.auto_unpack_enabled, !!fallback.auto_unpack_enabled),
    manual_unpack_enabled: boolToInt(body.manual_unpack_enabled, fallback.manual_unpack_enabled === undefined ? true : !!fallback.manual_unpack_enabled),
    manual_assemble_enabled: boolToInt(body.manual_assemble_enabled, fallback.manual_assemble_enabled === undefined ? true : !!fallback.manual_assemble_enabled),
    enabled: boolToInt(body.enabled, fallback.enabled === undefined ? true : !!fallback.enabled),
    remark: String(body.remark ?? fallback.remark ?? '').trim(),
  };
}

function assertVariantUsable(sku, label) {
  if (!sku || sku.deleted_at || sku.product_deleted_at) throw new BusinessError(404, `${label} SKU 不存在或已删除`);
  if (!sku.enabled) throw new BusinessError(400, `${label} SKU 已禁用，不能用于启用规则`);
}

function hasPath(edges, start, target) {
  const graph = new Map();
  for (const edge of edges) {
    const list = graph.get(edge.parent_variant_id) || [];
    list.push(edge.child_variant_id);
    graph.set(edge.parent_variant_id, list);
  }
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of graph.get(current) || []) stack.push(next);
  }
  return false;
}

async function validatePackRule(conn, input, excludeId = null) {
  if (!input.parent_variant_id) throw new BusinessError(400, '请选择大包装 SKU');
  if (!input.child_variant_id) throw new BusinessError(400, '请选择小包装 SKU');
  if (input.parent_variant_id === input.child_variant_id) throw new BusinessError(400, '大包装 SKU 和小包装 SKU 不能相同');
  if (!Number.isInteger(input.parent_qty) || input.parent_qty < 1) throw new BusinessError(400, '大包装换算数量必须大于等于 1');
  if (!Number.isInteger(input.child_qty) || input.child_qty <= 1) throw new BusinessError(400, '小包装换算数量必须大于 1');

  const skus = await repo.selectVariantsDetailsForUpdate(conn, [input.parent_variant_id, input.child_variant_id]);
  const skuMap = new Map(skus.map((s) => [s.id, s]));
  const parentSku = skuMap.get(input.parent_variant_id);
  const childSku = skuMap.get(input.child_variant_id);
  assertVariantUsable(parentSku, '大包装');
  assertVariantUsable(childSku, '小包装');

  const duplicate = await repo.countActivePackRulePair(conn, input.parent_variant_id, input.child_variant_id, excludeId);
  if (duplicate > 0) throw new BusinessError(409, '该大包装与小包装换算规则已存在');
  const reverse = await repo.countReversePackRule(conn, input.parent_variant_id, input.child_variant_id, excludeId);
  if (reverse > 0) throw new BusinessError(400, '不能建立 A→B 与 B→A 的反向循环规则');
  const edges = await repo.selectActivePackRuleEdges(conn, excludeId);
  edges.push({ parent_variant_id: input.parent_variant_id, child_variant_id: input.child_variant_id });
  if (hasPath(edges, input.child_variant_id, input.parent_variant_id)) {
    throw new BusinessError(400, '不能建立多级循环组装拆包规则');
  }
  if (input.enabled && input.auto_unpack_enabled) {
    const autoCount = await repo.countEnabledAutoRulesForChild(conn, input.child_variant_id, excludeId);
    if (autoCount > 0) throw new BusinessError(400, '同一个小包装 SKU 只能启用一条自动拆包规则');
  }
  return { parentSku, childSku };
}

function isLikelyMojibake(text) {
  const value = String(text || '');
  // encoding-check: ignore-next-line
  return /�|锟|鍞|璁|绠|娑|鎵|搴||崟/.test(value);
}

function normalizeRecordReason(row) {
  const reason = String(row.reason || '').trim();
  if (!reason) return '';
  if (!isLikelyMojibake(reason)) return reason;
  const orderNo = String(row.order_no_snapshot || row.order_no || '').trim();
  if (row.change_type === 'order_release') {
    return orderNo ? `订单 #${orderNo} 取消释放 SKU 库存` : '订单取消释放 SKU 库存';
  }
  if (row.change_type === 'order_deduct') {
    return orderNo ? `订单 #${orderNo} 下单扣减 SKU 库存` : '订单下单扣减 SKU 库存';
  }
  return reason;
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
    reason: normalizeRecordReason(row),
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

    const inputCost = Number(body.cost_price || 0);
    const oldCost = Number(sku.cost_price || 0);
    let nextCost = null;
    if (inputCost > 0 && changeType === 'in') {
      nextCost = beforeStock > 0 && oldCost > 0
        ? Math.round((((beforeStock * oldCost) + (qty * inputCost)) / (beforeStock + qty)) * 100) / 100
        : Math.round(inputCost * 100) / 100;
    } else if (inputCost > 0 && changeType === 'adjust') {
      nextCost = Math.round(inputCost * 100) / 100;
    }

    await repo.updateVariantStock(conn, variantId, afterStock);
    if (nextCost !== null) {
      await repo.updateVariantCostPrice(conn, variantId, nextCost);
    }
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
      after: { stock: afterStock, delta, cost_price: nextCost ?? oldCost, reason: body.reason || '', source_no: body.source_no || '' },
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
  await repo.batchUpdateVariantWarningThreshold(ids, threshold);
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
  const skuColumns = [
    'product_id', 'product_name', 'variant_id', 'variant_title', 'spec_text', 'sku_code', 'barcode',
    'price', 'cost_price', 'enabled', 'category_name', 'lifecycle_status',
    'stock', 'unit_name', 'reserved_stock', 'available_stock', 'stock_warning_threshold', 'updated_at',
  ];
  const csv = rowsToCsvLocalized(skuColumns, rows.map((r) => ({
    product_id: r.product_id,
    product_name: r.product_name,
    variant_id: r.variant_id,
    variant_title: r.variant_title || '',
    spec_text: r.spec_text || r.variant_title || '',
    sku_code: r.sku_code || '',
    barcode: r.barcode || '',
    price: Number(r.price || 0),
    cost_price: r.cost_price == null ? '' : Number(r.cost_price),
    enabled: r.enabled !== undefined ? Number(r.enabled) : 1,
    category_name: r.category_name || '',
    lifecycle_status: r.lifecycle_status,
    stock: Number(r.stock || 0),
    unit_name: r.unit_name || '件',
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
  const recordColumns = [
    'created_at', 'product_name', 'variant_name', 'sku_code', 'change_type', 'quantity_delta', 'before_stock',
    'after_stock', 'reason', 'remark', 'source_no', 'order_no', 'operator_name',
  ];
  const csv = rowsToCsvLocalized(recordColumns, rows.map((r) => ({
    created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
    product_name: r.product_name_snapshot || r.product_name || '',
    variant_name: r.variant_name_snapshot || r.variant_title || '',
    sku_code: r.sku_code_snapshot || r.variant_sku_code || '',
    change_type: labelInventoryChangeType(r.change_type),
    quantity_delta: Number(r.quantity_delta || 0),
    before_stock: Number(r.before_stock || 0),
    after_stock: Number(r.after_stock || 0),
    reason: normalizeRecordReason(r),
    remark: r.remark || '',
    source_no: r.source_no || '',
    order_no: r.order_no_snapshot || r.order_no || '',
    operator_name: r.operator_name || r.operator_id || '',
  })));
  return { csv, filename: `inventory_records_${Date.now()}.csv` };
}

async function listPackRules(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildPackRuleWhere(query);
  const total = await repo.countPackRules(where, params);
  const rows = await repo.selectPackRulesPage(where, params, pageSize, (page - 1) * pageSize);
  return { kind: 'paginate', list: rows.map(formatPackRule), total, page, pageSize };
}

async function createPackRule(body, adminUserId, req) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const input = normalizePackRuleInput(body);
    const { parentSku, childSku } = await validatePackRule(conn, input);
    const id = generateId();
    await repo.insertPackRule(conn, {
      id,
      parent_product_id: parentSku.product_id,
      parent_variant_id: parentSku.id,
      child_product_id: childSku.product_id,
      child_variant_id: childSku.id,
      parent_qty: input.parent_qty,
      child_qty: input.child_qty,
      auto_unpack_enabled: input.auto_unpack_enabled,
      manual_unpack_enabled: input.manual_unpack_enabled,
      manual_assemble_enabled: input.manual_assemble_enabled,
      enabled: input.enabled,
      remark: input.remark,
      created_by: adminUserId,
      updated_by: adminUserId,
    });
    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.pack_rule.create',
      objectType: 'inventory_pack_rule',
      objectId: id,
      summary: `创建组装拆包规则 ${parentSku.product_name}/${parentSku.title || parentSku.sku_code} -> ${childSku.product_name}/${childSku.title || childSku.sku_code}`,
      after: input,
      result: 'success',
    });
    return { data: await repo.selectPackRuleById(id), message: '规则已创建' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updatePackRule(id, body, adminUserId, req) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const before = await repo.selectPackRuleByIdForUpdate(conn, id);
    if (!before) throw new BusinessError(404, '组装拆包规则不存在');
    const input = normalizePackRuleInput(body, before);
    const { parentSku, childSku } = await validatePackRule(conn, input, id);
    await repo.updatePackRule(conn, id, {
      parent_product_id: parentSku.product_id,
      parent_variant_id: parentSku.id,
      child_product_id: childSku.product_id,
      child_variant_id: childSku.id,
      parent_qty: input.parent_qty,
      child_qty: input.child_qty,
      auto_unpack_enabled: input.auto_unpack_enabled,
      manual_unpack_enabled: input.manual_unpack_enabled,
      manual_assemble_enabled: input.manual_assemble_enabled,
      enabled: input.enabled,
      remark: input.remark,
      updated_by: adminUserId,
    });
    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.pack_rule.update',
      objectType: 'inventory_pack_rule',
      objectId: id,
      summary: `更新组装拆包规则 ${id}`,
      before,
      after: input,
      result: 'success',
    });
    return { data: await repo.selectPackRuleById(id), message: '规则已更新' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function deletePackRule(id, adminUserId, req) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const before = await repo.selectPackRuleByIdForUpdate(conn, id);
    if (!before) throw new BusinessError(404, '组装拆包规则不存在');
    await repo.softDeletePackRule(conn, id, adminUserId);
    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.pack_rule.delete',
      objectType: 'inventory_pack_rule',
      objectId: id,
      summary: `删除组装拆包规则 ${id}`,
      before,
      result: 'success',
    });
    return { data: null, message: '规则已删除' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function calculateChildTotal(inputParentQty, ruleParentQty, childQty) {
  const total = (inputParentQty * childQty) / Math.max(1, ruleParentQty);
  if (!Number.isInteger(total)) throw new BusinessError(400, '拆装数量无法按当前换算规则整除');
  return total;
}

async function convertByRule(type, body, adminUserId, req) {
  const ruleId = String(body.rule_id || '').trim();
  if (!ruleId) throw new BusinessError(400, '请选择组装拆包规则');
  const inputParentQty = Number(body.parent_qty);
  if (!Number.isInteger(inputParentQty) || inputParentQty <= 0) throw new BusinessError(400, '数量必须为大于 0 的整数');
  const remark = String(body.remark || '').trim();

  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const rule = await repo.selectPackRuleByIdForUpdate(conn, ruleId);
    if (!rule) throw new BusinessError(404, '组装拆包规则不存在');
    if (!rule.enabled) throw new BusinessError(400, '该规则已停用');
    if (type === 'unpack' && !rule.manual_unpack_enabled) throw new BusinessError(400, '该规则不允许手动拆包');
    if (type === 'assemble' && !rule.manual_assemble_enabled) throw new BusinessError(400, '该规则不允许手动组装');

    const skus = await repo.selectVariantsDetailsForUpdate(conn, [rule.parent_variant_id, rule.child_variant_id]);
    const skuMap = new Map(skus.map((s) => [s.id, s]));
    const parentSku = skuMap.get(rule.parent_variant_id);
    const childSku = skuMap.get(rule.child_variant_id);
    assertVariantUsable(parentSku, '大包装');
    assertVariantUsable(childSku, '小包装');

    const ruleParentQty = Number(rule.parent_qty || 1);
    const childQty = Number(rule.child_qty || 0);
    const childTotalQty = calculateChildTotal(inputParentQty, ruleParentQty, childQty);
    const parentBefore = Number(parentSku.stock || 0);
    const childBefore = Number(childSku.stock || 0);
    let parentAfter = parentBefore;
    let childAfter = childBefore;
    let parentDelta = 0;
    let childDelta = 0;

    if (type === 'unpack') {
      if (parentBefore < inputParentQty) throw new BusinessError(400, `大包装库存不足，当前库存 ${parentBefore}`);
      parentDelta = -inputParentQty;
      childDelta = childTotalQty;
    } else {
      if (childBefore < childTotalQty) throw new BusinessError(400, `小包装库存不足，当前库存 ${childBefore}`);
      parentDelta = inputParentQty;
      childDelta = -childTotalQty;
    }
    parentAfter = parentBefore + parentDelta;
    childAfter = childBefore + childDelta;

    await repo.updateVariantStock(conn, parentSku.id, parentAfter);
    await repo.updateVariantStock(conn, childSku.id, childAfter);
    const productIds = [...new Set([parentSku.product_id, childSku.product_id])];
    for (const productId of productIds) await repo.syncProductStockByProductId(conn, productId);

    const orderId = generateId();
    const orderNo = createConversionOrderNo(type === 'unpack' ? 'CB' : 'ZZ');
    await repo.insertConversionOrder(conn, {
      id: orderId,
      order_no: orderNo,
      type,
      rule_id: rule.id,
      parent_product_id: parentSku.product_id,
      parent_variant_id: parentSku.id,
      parent_qty: inputParentQty,
      child_product_id: childSku.product_id,
      child_variant_id: childSku.id,
      rule_parent_qty: ruleParentQty,
      child_qty_per_parent: childQty,
      child_total_qty: childTotalQty,
      parent_before_stock: parentBefore,
      parent_after_stock: parentAfter,
      child_before_stock: childBefore,
      child_after_stock: childAfter,
      parent_product_name_snapshot: parentSku.product_name,
      parent_variant_name_snapshot: parentSku.title || '',
      parent_sku_code_snapshot: parentSku.sku_code || '',
      parent_unit_name_snapshot: parentSku.unit_name || '件',
      child_product_name_snapshot: childSku.product_name,
      child_variant_name_snapshot: childSku.title || '',
      child_sku_code_snapshot: childSku.sku_code || '',
      child_unit_name_snapshot: childSku.unit_name || '件',
      source_type: 'manual',
      operator_id: adminUserId,
      remark,
    });

    const parentChangeType = type === 'unpack' ? 'unpack_parent_out' : 'assemble_parent_in';
    const childChangeType = type === 'unpack' ? 'unpack_child_in' : 'assemble_child_out';
    await repo.insertStockRecord(conn, {
      id: generateId(),
      productId: parentSku.product_id,
      variantId: parentSku.id,
      changeType: parentChangeType,
      quantityDelta: parentDelta,
      beforeStock: parentBefore,
      afterStock: parentAfter,
      reason: `${type === 'unpack' ? '手动拆包' : '手动组装'} ${orderNo}`,
      refType: 'inventory_conversion',
      refId: orderId,
      operatorId: adminUserId,
      productNameSnapshot: parentSku.product_name,
      variantNameSnapshot: parentSku.title || '',
      skuCodeSnapshot: parentSku.sku_code || '',
      sourceNo: orderNo,
      remark,
      createdByType: 'admin',
    });
    await repo.insertStockRecord(conn, {
      id: generateId(),
      productId: childSku.product_id,
      variantId: childSku.id,
      changeType: childChangeType,
      quantityDelta: childDelta,
      beforeStock: childBefore,
      afterStock: childAfter,
      reason: `${type === 'unpack' ? '手动拆包' : '手动组装'} ${orderNo}`,
      refType: 'inventory_conversion',
      refId: orderId,
      operatorId: adminUserId,
      productNameSnapshot: childSku.product_name,
      variantNameSnapshot: childSku.title || '',
      skuCodeSnapshot: childSku.sku_code || '',
      sourceNo: orderNo,
      remark,
      createdByType: 'admin',
    });

    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: type === 'unpack' ? 'inventory.conversion.unpack' : 'inventory.conversion.assemble',
      objectType: 'inventory_conversion_order',
      objectId: orderId,
      summary: `${type === 'unpack' ? '手动拆包' : '手动组装'} ${orderNo}`,
      after: { order_no: orderNo, rule_id: ruleId, parent_qty: inputParentQty, child_total_qty: childTotalQty },
      result: 'success',
    });
    return { data: await repo.selectConversionOrderById(orderId), message: type === 'unpack' ? '拆包完成' : '组装完成' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function unpack(body, adminUserId, req) {
  return convertByRule('unpack', body, adminUserId, req);
}

async function assemble(body, adminUserId, req) {
  return convertByRule('assemble', body, adminUserId, req);
}

async function listConversions(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildConversionWhere(query);
  const total = await repo.countConversionOrders(where, params);
  const rows = await repo.selectConversionOrdersPage(where, params, pageSize, (page - 1) * pageSize);
  return { kind: 'paginate', list: rows.map(formatConversionOrder), total, page, pageSize };
}

async function getConversion(id) {
  const row = await repo.selectConversionOrderById(id);
  if (!row) throw new BusinessError(404, '组装拆包单据不存在');
  return { data: formatConversionOrder(row) };
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
  listPackRules,
  createPackRule,
  updatePackRule,
  deletePackRule,
  unpack,
  assemble,
  listConversions,
  getConversion,
};








