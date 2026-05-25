const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/adminReplenishment.repository');
const inventoryRepo = require('../repository/adminInventory.repository');

const DEFAULT_VARIANT_TITLE = '默认规格';
const PAGE_SIZE_MAX = 200;
const SNAPSHOT_SCHEDULER_INTERVAL_MS = Number(process.env.INVENTORY_DAILY_SNAPSHOT_INTERVAL_MS || 60 * 60 * 1000);
const SNAPSHOT_SCHEDULER_INITIAL_DELAY_MS = Number(process.env.INVENTORY_DAILY_SNAPSHOT_INITIAL_DELAY_MS || 60 * 1000);

let dailySnapshotTimer = null;
let dailySnapshotInitialTimer = null;
let lastScheduledSnapshotDate = null;

function businessDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.BUSINESS_TIMEZONE || 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

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
  const warningStock = Math.max(0, toInt(row.lower_limit ?? row.warning_stock));
  const upperLimit = row.upper_limit == null ? null : Math.max(0, toInt(row.upper_limit));
  const inTransitQty = Math.max(0, toInt(row.in_transit_qty));
  const expectedAvailable = availableStock + inTransitQty;
  const targetStock = upperLimit != null && upperLimit >= warningStock ? upperLimit : warningStock;
  const unpackChildQty = Math.max(0, toInt(row.unpack_child_qty));
  const unpackParentQty = Math.max(1, toInt(row.unpack_parent_qty, 1));
  const unpackParentAvailable = Math.max(0, toInt(row.unpack_parent_available_stock));
  const unpackEquivalentStock = unpackChildQty > 0 ? Math.floor(unpackParentAvailable * unpackChildQty / unpackParentQty) : 0;
  const canUnpack = row.unpack_rule_id && availableStock + inTransitQty + unpackEquivalentStock >= warningStock;
  const shortage = canUnpack ? 0 : Math.max(targetStock - expectedAvailable, 0);
  const suggestedQty = roundUpToMultiple(shortage, 1);
  const hasTransit = inTransitQty > 0;
  const alertStatus = hasTransit && expectedAvailable >= warningStock ? 'in_transit' : 'pending';
  const riskLevel = availableStock <= 0
    ? 'out_of_stock'
    : expectedAvailable <= warningStock
      ? 'below_lower_limit'
      : upperLimit != null && availableStock > upperLimit
        ? 'overstock'
        : 'normal';
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
    lower_limit: warningStock,
    upper_limit: upperLimit,
    suggestion_type: canUnpack ? 'unpack' : 'purchase',
    strategy_snapshot: {
      target_stock: targetStock,
      trigger: 'lower_limit',
      risk_level: riskLevel,
      unpack_rule_id: row.unpack_rule_id || null,
      unpack_parent_variant_id: row.unpack_parent_variant_id || null,
      unpack_equivalent_stock: unpackEquivalentStock,
      suggested_unpack_parent_qty: canUnpack && unpackChildQty > 0
        ? Math.max(1, Math.ceil(Math.max(0, warningStock - availableStock - inTransitQty) / unpackChildQty))
        : 0,
    },
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
    lower_limit: row.lower_limit == null ? null : toInt(row.lower_limit),
    upper_limit: row.upper_limit == null ? null : toInt(row.upper_limit),
    suggested_qty: toInt(row.suggested_qty),
    ordered_qty: toInt(row.ordered_qty),
    received_qty: toInt(row.received_qty),
    in_transit_qty: toInt(row.in_transit_qty),
    expected_available_stock: toInt(row.available_stock) + toInt(row.in_transit_qty),
    purchase_order_id: row.purchase_order_id || null,
    suggestion_type: row.suggestion_type || 'purchase',
    strategy_snapshot: typeof row.strategy_snapshot === 'string'
      ? (() => { try { return JSON.parse(row.strategy_snapshot); } catch (_) { return null; } })()
      : (row.strategy_snapshot || null),
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

function strategyParams(body = {}) {
  const strategy = String(body.strategy || 'balanced');
  const presets = {
    conservative: { lead_time_days: 7, safety_stock_days: 2, target_cover_days: 14 },
    balanced: { lead_time_days: 7, safety_stock_days: 3, target_cover_days: 20 },
    aggressive: { lead_time_days: 7, safety_stock_days: 5, target_cover_days: 30 },
  };
  const base = presets[strategy] || presets.balanced;
  return {
    strategy,
    analysis_days: Math.max(7, Math.min(90, toInt(body.analysis_days, 30))),
    lead_time_days: Math.max(0, toInt(body.lead_time_days, base.lead_time_days)),
    safety_stock_days: Math.max(0, toInt(body.safety_stock_days, base.safety_stock_days)),
    target_cover_days: Math.max(1, toInt(body.target_cover_days, base.target_cover_days)),
    min_floor_stock: Math.max(0, toInt(body.min_floor_stock, 0)),
    purchase_multiple: Math.max(1, toInt(body.purchase_multiple, 1)),
  };
}

async function createSmartReplenishmentPreview(body = {}, adminUserId = null, req = null) {
  const params = strategyParams(body);
  const variantIds = Array.isArray(body.variant_ids) ? body.variant_ids.filter(Boolean) : [];
  const conn = await repo.getConnection();
  const runId = generateId();
  try {
    await conn.beginTransaction();
    const candidates = await repo.selectSmartLimitCandidates(conn, variantIds);
    const statsMap = await repo.selectDailySnapshotStats(conn, candidates.map((c) => c.variant_id), params.analysis_days);
    await repo.insertReplenishmentRun(conn, {
      id: runId,
      scope_type: variantIds.length ? 'variant_ids' : 'all',
      scope_snapshot: { variant_ids: variantIds },
      analysis_days: params.analysis_days,
      strategy: params.strategy,
      status: 'preview',
      created_by: adminUserId,
    });

    const items = [];
    for (const candidate of candidates) {
      const stats = statsMap.get(candidate.variant_id) || {};
      const snapshotDays = toInt(stats.snapshot_days);
      const salesQty = toInt(stats.sales_qty);
      const stockoutDays = toInt(stats.stockout_days);
      const effectiveDays = Math.max(1, snapshotDays - stockoutDays);
      const avgDailySales = snapshotDays > 0 ? salesQty / effectiveDays : 0;
      const historyIncomplete = snapshotDays < Math.min(params.analysis_days, 7);
      const sampleInsufficient = salesQty < 3 || avgDailySales <= 0;
      const suggestedLower = sampleInsufficient
        ? Number(candidate.stock_lower_limit || params.min_floor_stock || 0)
        : Math.max(params.min_floor_stock, Math.ceil(avgDailySales * (params.lead_time_days + params.safety_stock_days)));
      const suggestedUpper = sampleInsufficient
        ? Number(candidate.stock_upper_limit || Math.max(suggestedLower, params.min_floor_stock))
        : Math.max(suggestedLower, Math.ceil(avgDailySales * (params.lead_time_days + params.safety_stock_days + params.target_cover_days)));
      const suggestedQty = sampleInsufficient
        ? 0
        : roundUpToMultiple(Math.max(0, suggestedUpper - toInt(candidate.available_stock) - toInt(candidate.in_transit_qty)), params.purchase_multiple);
      const reason = historyIncomplete
        ? '历史数据不完整，仅供观察'
        : sampleInsufficient
          ? '新品或低销量样本不足，仅建议观察'
          : `按 ${params.analysis_days} 天销量和 ${effectiveDays} 个有效销售日计算`;
      const confidence = historyIncomplete ? 30 : sampleInsufficient ? 40 : Math.min(95, Math.round((snapshotDays / params.analysis_days) * 80 + 15));
      const item = {
        id: generateId(),
        run_id: runId,
        variant_id: candidate.variant_id,
        product_name: candidate.product_name,
        variant_title: candidate.variant_title,
        sku_code: candidate.sku_code,
        old_lower_limit: candidate.stock_lower_limit,
        old_upper_limit: candidate.stock_upper_limit,
        suggested_lower_limit: suggestedLower,
        suggested_upper_limit: suggestedUpper,
        current_stock: toInt(candidate.current_stock),
        available_stock: toInt(candidate.available_stock),
        in_transit_qty: toInt(candidate.in_transit_qty),
        sales_qty: salesQty,
        saleable_days: effectiveDays,
        avg_daily_sales: Number(avgDailySales.toFixed(4)),
        suggested_replenishment_qty: suggestedQty,
        confidence_score: confidence,
        reason,
        apply_status: 'pending',
      };
      await repo.insertReplenishmentRunItem(conn, item);
      items.push(item);
    }
    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.smart_replenishment.preview',
      objectType: 'inventory_replenishment_run',
      objectId: runId,
      summary: `生成智能补货预览 ${items.length} 项`,
      after: { params, count: items.length },
      result: 'success',
    });
    return { id: runId, status: 'preview', params, items };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function applySmartReplenishmentRun(runId, body = {}, adminUserId = null, req = null) {
  const overrides = new Map((Array.isArray(body.items) ? body.items : []).map((item) => [String(item.id), item]));
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const rows = await repo.selectRunItemsForUpdate(conn, runId, [...overrides.keys()]);
    if (!rows.length) throw new BusinessError(404, '智能补货预览不存在或没有可应用明细');
    const applied = [];
    for (const row of rows) {
      const override = overrides.get(String(row.id)) || {};
      const lower = Math.max(0, toInt(override.suggested_lower_limit ?? row.suggested_lower_limit));
      const upper = Math.max(lower, toInt(override.suggested_upper_limit ?? row.suggested_upper_limit));
      const qty = Math.max(0, toInt(override.suggested_replenishment_qty ?? row.suggested_replenishment_qty));
      await repo.updateVariantLimits(conn, row.variant_id, lower, upper);
      await repo.markRunItemApplied(conn, row.id, lower, upper, qty);
      applied.push({
        id: row.id,
        variant_id: row.variant_id,
        before: { stock_lower_limit: row.stock_lower_limit, stock_upper_limit: row.stock_upper_limit },
        after: { stock_lower_limit: lower, stock_upper_limit: upper, suggested_replenishment_qty: qty },
      });
    }
    await repo.updateRunStatus(conn, runId, 'applied');
    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.smart_replenishment.apply',
      objectType: 'inventory_replenishment_run',
      objectId: runId,
      summary: `应用智能补货上下限 ${applied.length} 项`,
      before: applied.map((x) => ({ id: x.id, variant_id: x.variant_id, ...x.before })),
      after: applied.map((x) => ({ id: x.id, variant_id: x.variant_id, ...x.after })),
      result: 'success',
    });
    return { id: runId, applied: applied.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function createPurchaseOrderFromSmartRun(runId, body = {}, adminUserId = null, req = null) {
  const overrides = new Map((Array.isArray(body.items) ? body.items : []).map((item) => [String(item.id), item]));
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const rows = await repo.selectRunItemsForUpdate(conn, runId, [...overrides.keys()]);
    const purchaseRows = rows
      .map((row) => {
        const override = overrides.get(String(row.id)) || {};
        return {
          ...row,
          suggested_replenishment_qty: Math.max(0, toInt(override.suggested_replenishment_qty ?? row.suggested_replenishment_qty)),
          unit_cost: override.unit_cost == null || override.unit_cost === '' ? null : Number(override.unit_cost),
        };
      })
      .filter((row) => row.suggested_replenishment_qty > 0);
    if (!purchaseRows.length) throw new BusinessError(400, '没有可生成采购单的补货建议');
    for (const row of purchaseRows) {
      if (row.unit_cost != null && (!Number.isFinite(row.unit_cost) || row.unit_cost < 0)) {
        throw new BusinessError(400, '采购单价无效');
      }
    }

    const poId = generateId();
    const orderNo = createPurchaseOrderNo();
    const totalAmount = purchaseRows.reduce((sum, row) => (
      sum + (row.unit_cost == null ? 0 : row.unit_cost * row.suggested_replenishment_qty)
    ), 0);
    await repo.insertPurchaseOrder(conn, {
      id: poId,
      order_no: orderNo,
      supplier_id: body.supplier_id || null,
      status: 'ordered',
      expected_arrival_date: body.expected_arrival_date || null,
      total_amount: Math.round(totalAmount * 100) / 100,
      remark: body.remark || `智能补货批次 ${runId}`,
      created_by: adminUserId,
    });
    for (const row of purchaseRows) {
      await repo.insertPurchaseOrderItem(conn, {
        id: generateId(),
        purchase_order_id: poId,
        variant_id: row.variant_id,
        ordered_qty: row.suggested_replenishment_qty,
        unit_cost: row.unit_cost,
      });
      await repo.markRunItemApplied(
        conn,
        row.id,
        toInt(row.suggested_lower_limit),
        Math.max(toInt(row.suggested_lower_limit), toInt(row.suggested_upper_limit)),
        row.suggested_replenishment_qty,
      );
    }
    await repo.updateRunStatus(conn, runId, 'ordered');
    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.smart_replenishment.create_purchase_order',
      objectType: 'inventory_replenishment_run',
      objectId: runId,
      summary: `智能补货生成采购单 ${orderNo}`,
      after: {
        purchase_order_id: poId,
        order_no: orderNo,
        item_count: purchaseRows.length,
        total_ordered_qty: purchaseRows.reduce((sum, row) => sum + row.suggested_replenishment_qty, 0),
      },
      result: 'success',
    });
    return { id: poId, order_no: orderNo, item_count: purchaseRows.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function normalizeSnapshotDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return businessDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new BusinessError(400, 'snapshot_date must be YYYY-MM-DD');
  return raw;
}

async function generateDailyInventorySnapshot(body = {}, adminUserId = null, req = null) {
  const snapshotDate = normalizeSnapshotDate(body.snapshot_date);
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const result = await repo.upsertDailyInventorySnapshots(conn, snapshotDate);
    await conn.commit();
    const affected = Number(result?.affectedRows || 0);
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'inventory.daily_snapshot.generate',
      objectType: 'inventory_daily_snapshot',
      objectId: snapshotDate,
      summary: `Generate inventory daily snapshot ${snapshotDate}`,
      after: { snapshot_date: snapshotDate, affected_rows: affected },
      result: 'success',
    });
    return { snapshot_date: snapshotDate, affected_rows: affected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function runScheduledDailyInventorySnapshot() {
  const snapshotDate = businessDateString();
  if (lastScheduledSnapshotDate === snapshotDate) return { skipped: true, snapshot_date: snapshotDate };
  const result = await generateDailyInventorySnapshot({ snapshot_date: snapshotDate }, null, null);
  lastScheduledSnapshotDate = snapshotDate;
  return result;
}

function startDailyInventorySnapshotScheduler() {
  if (dailySnapshotTimer || process.env.INVENTORY_DAILY_SNAPSHOT_DISABLED === '1') return;
  const tick = () => {
    runScheduledDailyInventorySnapshot().catch((error) => {
      console.error('[inventory.daily-snapshot.scheduler] failed:', error?.message || error);
    });
  };
  dailySnapshotInitialTimer = setTimeout(tick, Math.max(0, SNAPSHOT_SCHEDULER_INITIAL_DELAY_MS));
  if (dailySnapshotInitialTimer.unref) dailySnapshotInitialTimer.unref();
  dailySnapshotTimer = setInterval(tick, Math.max(60_000, SNAPSHOT_SCHEDULER_INTERVAL_MS));
  if (dailySnapshotTimer.unref) dailySnapshotTimer.unref();
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
  createSmartReplenishmentPreview,
  applySmartReplenishmentRun,
  createPurchaseOrderFromSmartRun,
  generateDailyInventorySnapshot,
  runScheduledDailyInventorySnapshot,
  startDailyInventorySnapshotScheduler,
};
