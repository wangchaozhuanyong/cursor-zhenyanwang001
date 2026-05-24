const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const repo = require('../repository/adminReplenishment.repository');
const inventoryRepo = require('../repository/adminInventory.repository');

const DEFAULT_VARIANT_TITLE = '默认规格';
const PAGE_SIZE_MAX = 200;

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function roundUpToMultiple(qty, multiple = 1) {
  const n = Math.max(0, toInt(qty));
  const m = Math.max(1, toInt(multiple, 1));
  return Math.ceil(n / m) * m;
}

function buildAlertSnapshot(row) {
  const availableStock = toInt(row.available_stock);
  const warningStock = Math.max(0, toInt(row.warning_stock));
  const inTransitQty = Math.max(0, toInt(row.in_transit_qty));
  const expectedAvailable = availableStock + inTransitQty;
  const shortage = Math.max(warningStock - expectedAvailable, 0);
  const suggestedQty = roundUpToMultiple(shortage, 1);
  const hasTransit = inTransitQty > 0;
  const alertStatus = hasTransit && expectedAvailable >= warningStock ? 'in_transit' : 'pending';
  const reason = hasTransit && shortage > 0
    ? `已补货不足：预计可用 ${expectedAvailable}，仍低于预警库存 ${warningStock}`
    : hasTransit
      ? `已补货待到货：预计可用 ${expectedAvailable}，达到预警库存 ${warningStock}`
      : `低库存：可用库存 ${availableStock}，低于或等于预警库存 ${warningStock}`;

  return {
    variant_id: row.variant_id,
    alert_status: alertStatus,
    current_stock: toInt(row.current_stock),
    available_stock: availableStock,
    warning_stock: warningStock,
    suggested_qty: suggestedQty,
    ordered_qty: Math.max(0, toInt(row.ordered_qty)),
    received_qty: Math.max(0, toInt(row.received_qty)),
    in_transit_qty: inTransitQty,
    purchase_order_id: row.purchase_order_id || null,
    expected_arrival_date: row.expected_arrival_date || null,
    reason,
    remark: null,
  };
}

function buildAlertWhere(query = {}) {
  let where = 'WHERE p.deleted_at IS NULL AND v.deleted_at IS NULL';
  const params = [];
  const status = String(query.status || '').trim();
  if (status) {
    where += ' AND a.alert_status = ?';
    params.push(status);
  }
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ' AND (p.name LIKE ? OR v.title LIKE ? OR v.sku_code LIKE ? OR a.reason LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (query.variant_id) {
    where += ' AND a.variant_id = ?';
    params.push(String(query.variant_id));
  }
  return { where, params };
}

function formatAlert(row) {
  const variantTitle = row.variant_title || DEFAULT_VARIANT_TITLE;
  return {
    id: row.id,
    variant_id: row.variant_id,
    product_id: row.product_id,
    product_name: row.product_name || '',
    cover_image: row.cover_image || '',
    variant_title: variantTitle,
    sku_code: row.sku_code || '',
    unit_name: row.unit_name || '件',
    alert_status: row.alert_status,
    current_stock: toInt(row.current_stock),
    available_stock: toInt(row.available_stock),
    warning_stock: toInt(row.warning_stock),
    suggested_qty: toInt(row.suggested_qty),
    ordered_qty: toInt(row.ordered_qty),
    received_qty: toInt(row.received_qty),
    in_transit_qty: toInt(row.in_transit_qty),
    expected_available_stock: toInt(row.available_stock) + toInt(row.in_transit_qty),
    purchase_order_id: row.purchase_order_id || null,
    purchase_order_no: row.purchase_order_no || '',
    purchase_order_status: row.purchase_order_status || '',
    expected_arrival_date: row.expected_arrival_date || null,
    reason: row.reason || '',
    remark: row.remark || '',
    last_alert_at: row.last_alert_at || null,
    snoozed_until: row.snoozed_until || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function createPurchaseOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `PO${y}${m}${d}${Date.now().toString().slice(-6)}`;
}

async function generateReplenishmentAlerts() {
  const candidates = await repo.selectReplenishmentCandidates();
  const conn = await repo.getConnection();
  let created = 0;
  let updated = 0;
  try {
    await conn.beginTransaction();
    for (const candidate of candidates) {
      const snapshot = buildAlertSnapshot(candidate);
      const existing = await repo.selectOpenAlertByVariantId(conn, snapshot.variant_id);
      if (existing) {
        await repo.updateAlert(conn, existing.id, snapshot);
        updated += 1;
      } else {
        await repo.insertAlert(conn, { ...snapshot, id: generateId() });
        created += 1;
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return { created, updated, scanned: candidates.length };
}

async function listReplenishmentAlerts(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildAlertWhere(query);
  const [total, rows] = await Promise.all([
    repo.countAlerts(where, params),
    repo.selectAlertsPage(where, params, pageSize, (page - 1) * pageSize),
  ]);
  return {
    list: rows.map(formatAlert),
    total,
    page,
    pageSize,
  };
}

function buildPurchaseOrderWhere(query = {}) {
  let where = 'WHERE 1=1';
  const params = [];
  const status = String(query.status || '').trim();
  if (status) {
    where += ' AND po.status = ?';
    params.push(status);
  }
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ' AND (po.order_no LIKE ? OR po.remark LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  return { where, params };
}

function formatPurchaseOrder(row) {
  return {
    id: row.id,
    order_no: row.order_no,
    supplier_id: row.supplier_id || null,
    status: row.status,
    expected_arrival_date: row.expected_arrival_date || null,
    actual_arrival_date: row.actual_arrival_date || null,
    total_amount: Number(row.total_amount || 0),
    remark: row.remark || '',
    item_count: toInt(row.item_count),
    ordered_qty: toInt(row.ordered_qty),
    received_qty: toInt(row.received_qty),
    in_transit_qty: toInt(row.in_transit_qty),
    created_by: row.created_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatPurchaseOrderItem(row) {
  return {
    id: row.id,
    purchase_order_id: row.purchase_order_id,
    variant_id: row.variant_id,
    product_id: row.product_id,
    product_name: row.product_name || '',
    variant_title: row.variant_title || DEFAULT_VARIANT_TITLE,
    sku_code: row.sku_code || '',
    unit_name: row.unit_name || '件',
    ordered_qty: toInt(row.ordered_qty),
    received_qty: toInt(row.received_qty),
    remaining_qty: Math.max(0, toInt(row.ordered_qty) - toInt(row.received_qty)),
    unit_cost: row.unit_cost == null ? null : Number(row.unit_cost),
    batch_no: row.batch_no || '',
    production_date: row.production_date || null,
    shelf_life_days: row.shelf_life_days == null ? null : toInt(row.shelf_life_days),
    expiry_date: row.expiry_date || null,
    supplier_sku: row.supplier_sku || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listPurchaseOrders(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildPurchaseOrderWhere(query);
  const [total, rows] = await Promise.all([
    repo.countPurchaseOrders(where, params),
    repo.selectPurchaseOrdersPage(where, params, pageSize, (page - 1) * pageSize),
  ]);
  return { list: rows.map(formatPurchaseOrder), total, page, pageSize };
}

async function getPurchaseOrder(id) {
  const row = await repo.selectPurchaseOrderById(id);
  if (!row) throw new BusinessError(404, '采购单不存在');
  const items = await repo.selectPurchaseOrderItems(id);
  return {
    ...formatPurchaseOrder(row),
    items: items.map(formatPurchaseOrderItem),
  };
}

async function createPurchaseOrderFromAlert(alertId, body = {}, adminUserId = null) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const alert = await repo.selectAlertByIdForUpdate(conn, alertId);
    if (!alert) throw new BusinessError(404, '补货预警不存在');
    if (['resolved', 'cancelled', 'ignored'].includes(String(alert.alert_status))) {
      throw new BusinessError(400, '当前预警已关闭，不能生成采购单');
    }
    const qty = Math.max(1, toInt(body.ordered_qty ?? body.quantity ?? alert.suggested_qty, 0));
    const unitCost = body.unit_cost == null || body.unit_cost === '' ? null : Number(body.unit_cost);
    if (unitCost != null && (!Number.isFinite(unitCost) || unitCost < 0)) {
      throw new BusinessError(400, '采购单价无效');
    }
    const poId = generateId();
    const itemId = generateId();
    const orderNo = createPurchaseOrderNo();
    const totalAmount = unitCost == null ? 0 : Math.round(unitCost * qty * 100) / 100;
    const expectedArrivalDate = body.expected_arrival_date || alert.expected_arrival_date || null;
    await repo.insertPurchaseOrder(conn, {
      id: poId,
      order_no: orderNo,
      supplier_id: body.supplier_id || null,
      status: 'ordered',
      expected_arrival_date: expectedArrivalDate,
      total_amount: totalAmount,
      remark: body.remark || null,
      created_by: adminUserId,
    });
    await repo.insertPurchaseOrderItem(conn, {
      id: itemId,
      purchase_order_id: poId,
      variant_id: alert.variant_id,
      ordered_qty: qty,
      unit_cost: unitCost,
      batch_no: body.batch_no || null,
      production_date: body.production_date || null,
      shelf_life_days: body.shelf_life_days || null,
      expiry_date: body.expiry_date || null,
      supplier_sku: body.supplier_sku || null,
    });
    await repo.updateAlertStatus(conn, alert.id, {
      alert_status: 'in_transit',
      purchase_order_id: poId,
      ordered_qty: toInt(alert.ordered_qty) + qty,
      received_qty: toInt(alert.received_qty),
      in_transit_qty: toInt(alert.in_transit_qty) + qty,
      expected_arrival_date: expectedArrivalDate,
      reason: `已生成采购单 ${orderNo}，待到货 ${qty}`,
      remark: body.remark || alert.remark || null,
    });
    await conn.commit();
    return { id: poId, order_no: orderNo, item_id: itemId, ordered_qty: qty };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function refreshOpenAlertForVariant(conn, variantId) {
  const existing = await repo.selectOpenAlertByVariantId(conn, variantId);
  const snapshot = await repo.selectVariantReplenishmentSnapshot(conn, variantId);
  if (!existing || !snapshot) return;
  const next = buildAlertSnapshot(snapshot);
  const available = toInt(next.available_stock);
  const warning = toInt(next.warning_stock);
  const inTransit = toInt(next.in_transit_qty);
  if (available > warning && inTransit <= 0) {
    await repo.updateAlertStatus(conn, existing.id, {
      ...next,
      alert_status: 'resolved',
      reason: `库存已恢复：可用库存 ${available} 高于预警库存 ${warning}`,
    });
  } else {
    await repo.updateAlert(conn, existing.id, next);
  }
}

async function receivePurchaseOrder(purchaseOrderId, body = {}, adminUserId = null) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const items = await repo.selectPurchaseOrderItemsForUpdate(conn, purchaseOrderId);
    if (!items.length) throw new BusinessError(404, '采购单不存在或没有明细');
    const currentStatus = String(items[0].purchase_status || '');
    if (['cancelled', 'received'].includes(currentStatus)) {
      throw new BusinessError(400, '当前采购单状态不能继续入库');
    }
    const receiveMap = new Map();
    for (const item of Array.isArray(body.items) ? body.items : []) {
      receiveMap.set(String(item.id || item.item_id || ''), item);
    }

    let changed = 0;
    const touchedVariants = new Set();
    for (const item of items) {
      const payload = receiveMap.get(String(item.id));
      const remaining = Math.max(0, toInt(item.ordered_qty) - toInt(item.received_qty));
      const qty = payload
        ? Math.max(0, toInt(payload.received_qty ?? payload.quantity))
        : remaining;
      if (qty <= 0) continue;
      if (qty > remaining) throw new BusinessError(400, `到货数量不能超过未到货数量（${item.sku_code || item.variant_title || item.id}）`);
      const beforeStock = toInt(item.stock);
      const afterStock = beforeStock + qty;
      const oldCost = Number(item.cost_price || 0);
      const unitCost = payload?.unit_cost == null || payload?.unit_cost === ''
        ? Number(item.unit_cost || 0)
        : Number(payload.unit_cost);
      let nextCost = null;
      if (unitCost > 0) {
        nextCost = beforeStock > 0 && oldCost > 0
          ? Math.round((((beforeStock * oldCost) + (qty * unitCost)) / (beforeStock + qty)) * 100) / 100
          : Math.round(unitCost * 100) / 100;
      }
      await inventoryRepo.updateVariantStock(conn, item.variant_id, afterStock);
      if (nextCost !== null) await inventoryRepo.updateVariantCostPrice(conn, item.variant_id, nextCost);
      await inventoryRepo.syncProductStockByProductId(conn, item.product_id);
      await inventoryRepo.insertStockRecord(conn, {
        id: generateId(),
        productId: item.product_id,
        variantId: item.variant_id,
        changeType: 'in',
        quantityDelta: qty,
        beforeStock,
        afterStock,
        reason: '采购到货入库',
        refType: 'purchase_order',
        refId: purchaseOrderId,
        operatorId: adminUserId,
        productNameSnapshot: item.product_name,
        variantNameSnapshot: item.variant_title || DEFAULT_VARIANT_TITLE,
        skuCodeSnapshot: item.sku_code || '',
        orderNoSnapshot: '',
        sourceNo: item.order_no,
        remark: body.remark || '',
        costPrice: unitCost > 0 ? unitCost : null,
        createdByType: 'admin',
      });
      await repo.updatePurchaseOrderItemReceived(conn, item.id, toInt(item.received_qty) + qty);
      changed += qty;
      touchedVariants.add(item.variant_id);
    }

    const updatedItems = await repo.selectPurchaseOrderItemsForUpdate(conn, purchaseOrderId);
    const allReceived = updatedItems.every((item) => toInt(item.received_qty) >= toInt(item.ordered_qty));
    const anyReceived = updatedItems.some((item) => toInt(item.received_qty) > 0);
    const nextStatus = allReceived ? 'received' : anyReceived ? 'partial_received' : currentStatus || 'ordered';
    await repo.updatePurchaseOrderStatus(conn, purchaseOrderId, nextStatus, allReceived ? (body.actual_arrival_date || new Date()) : null);
    for (const variantId of touchedVariants) {
      await refreshOpenAlertForVariant(conn, variantId);
    }
    await conn.commit();
    return { received_qty: changed, status: nextStatus };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  generateReplenishmentAlerts,
  listReplenishmentAlerts,
  createPurchaseOrderFromAlert,
  listPurchaseOrders,
  getPurchaseOrder,
  receivePurchaseOrder,
};
