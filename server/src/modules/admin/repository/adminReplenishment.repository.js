const db = require('../../../config/db');
const { PAID_PAYMENT_STATUS_LIST } = require('../../../constants/status');

const OPEN_ALERT_STATUSES = ['pending', 'suggested', 'ordered', 'in_transit', 'partial_received', 'overdue', 'snoozed'];
const IN_TRANSIT_PO_STATUSES = ['ordered', 'in_transit', 'partial_received'];

function placeholders(list) {
  return list.map(() => '?').join(',');
}

async function selectReplenishmentCandidates() {
  const [rows] = await db.query(
    `SELECT
       v.id AS variant_id,
       v.product_id,
       p.name AS product_name,
       v.title AS variant_title,
       v.sku_code,
       v.stock AS current_stock,
       COALESCE(v.reserved_stock, 0) AS reserved_stock,
       GREATEST(v.stock - COALESCE(v.reserved_stock, 0), 0) AS available_stock,
       COALESCE(v.stock_lower_limit, v.stock_warning_threshold, 5) AS warning_stock,
       COALESCE(v.stock_lower_limit, v.stock_warning_threshold, 5) AS lower_limit,
       v.stock_upper_limit AS upper_limit,
       COALESCE(poagg.ordered_qty, 0) AS ordered_qty,
       COALESCE(poagg.received_qty, 0) AS received_qty,
       COALESCE(poagg.in_transit_qty, 0) AS in_transit_qty,
       poagg.purchase_order_id,
       poagg.expected_arrival_date,
       pr.id AS unpack_rule_id,
       pr.parent_variant_id AS unpack_parent_variant_id,
       pr.child_qty AS unpack_child_qty,
       pr.parent_qty AS unpack_parent_qty,
       GREATEST(COALESCE(pv.stock, 0) - COALESCE(pv.reserved_stock, 0), 0) AS unpack_parent_available_stock
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN inventory_pack_rules pr ON pr.child_variant_id = v.id
       AND pr.deleted_at IS NULL
       AND pr.enabled = 1
       AND pr.manual_unpack_enabled = 1
     LEFT JOIN product_variants pv ON pv.id = pr.parent_variant_id
       AND pv.deleted_at IS NULL
       AND pv.enabled = 1
     LEFT JOIN (
       SELECT
         poi.variant_id,
         SUM(poi.ordered_qty) AS ordered_qty,
         SUM(poi.received_qty) AS received_qty,
         SUM(GREATEST(poi.ordered_qty - poi.received_qty, 0)) AS in_transit_qty,
         MIN(po.expected_arrival_date) AS expected_arrival_date,
         SUBSTRING_INDEX(GROUP_CONCAT(po.id ORDER BY po.expected_arrival_date IS NULL, po.expected_arrival_date ASC, po.created_at ASC), ',', 1) AS purchase_order_id
       FROM purchase_order_items poi
       JOIN purchase_orders po ON po.id = poi.purchase_order_id
       WHERE po.status IN (${placeholders(IN_TRANSIT_PO_STATUSES)})
       GROUP BY poi.variant_id
     ) poagg ON poagg.variant_id = v.id
     WHERE p.deleted_at IS NULL
       AND v.deleted_at IS NULL
       AND v.enabled = 1
       AND (
         GREATEST(v.stock - COALESCE(v.reserved_stock, 0), 0) + COALESCE(poagg.in_transit_qty, 0)
       ) <= COALESCE(v.stock_lower_limit, v.stock_warning_threshold, 5)`,
    IN_TRANSIT_PO_STATUSES,
  );
  return rows;
}

async function selectOpenAlertByVariantId(conn, variantId) {
  const [rows] = await conn.query(
    `SELECT * FROM inventory_replenishment_alerts
     WHERE variant_id = ? AND alert_status IN (${placeholders(OPEN_ALERT_STATUSES)})
     ORDER BY updated_at DESC
     LIMIT 1
     FOR UPDATE`,
    [variantId, ...OPEN_ALERT_STATUSES],
  );
  return rows[0] || null;
}

async function selectAlertByIdForUpdate(conn, id) {
  const [rows] = await conn.query(
    `SELECT
       a.*,
       v.product_id,
       v.title AS variant_title,
       v.sku_code,
       v.stock,
       COALESCE(v.reserved_stock, 0) AS reserved_stock,
       COALESCE(v.stock_warning_threshold, 5) AS variant_warning_stock,
       p.name AS product_name
     FROM inventory_replenishment_alerts a
     JOIN product_variants v ON v.id = a.variant_id
     JOIN products p ON p.id = v.product_id
     WHERE a.id = ?
     FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function insertAlert(conn, row) {
  await conn.query(
    `INSERT INTO inventory_replenishment_alerts
      (id, variant_id, alert_status, current_stock, available_stock, warning_stock, suggested_qty,
       ordered_qty, received_qty, in_transit_qty, purchase_order_id, expected_arrival_date, last_alert_at, reason, remark,
       lower_limit, upper_limit, suggestion_type, strategy_snapshot)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?,?,?,?)`,
    [
      row.id,
      row.variant_id,
      row.alert_status,
      row.current_stock,
      row.available_stock,
      row.warning_stock,
      row.suggested_qty,
      row.ordered_qty,
      row.received_qty,
      row.in_transit_qty,
      row.purchase_order_id || null,
      row.expected_arrival_date || null,
      row.reason || null,
      row.remark || null,
      row.lower_limit ?? null,
      row.upper_limit ?? null,
      row.suggestion_type || 'purchase',
      row.strategy_snapshot ? JSON.stringify(row.strategy_snapshot) : null,
    ],
  );
}

async function updateAlert(conn, id, row) {
  await conn.query(
    `UPDATE inventory_replenishment_alerts
     SET alert_status = ?,
         current_stock = ?,
         available_stock = ?,
         warning_stock = ?,
         suggested_qty = ?,
         ordered_qty = ?,
         received_qty = ?,
         in_transit_qty = ?,
         purchase_order_id = ?,
         expected_arrival_date = ?,
         last_alert_at = NOW(),
         reason = ?,
         remark = ?,
         lower_limit = ?,
         upper_limit = ?,
         suggestion_type = ?,
         strategy_snapshot = ?
     WHERE id = ?`,
    [
      row.alert_status,
      row.current_stock,
      row.available_stock,
      row.warning_stock,
      row.suggested_qty,
      row.ordered_qty,
      row.received_qty,
      row.in_transit_qty,
      row.purchase_order_id || null,
      row.expected_arrival_date || null,
      row.reason || null,
      row.remark || null,
      row.lower_limit ?? null,
      row.upper_limit ?? null,
      row.suggestion_type || 'purchase',
      row.strategy_snapshot ? JSON.stringify(row.strategy_snapshot) : null,
      id,
    ],
  );
}

async function updateAlertStatus(conn, id, row) {
  await conn.query(
    `UPDATE inventory_replenishment_alerts
     SET alert_status = ?,
         purchase_order_id = COALESCE(?, purchase_order_id),
         ordered_qty = ?,
         received_qty = ?,
         in_transit_qty = ?,
         expected_arrival_date = ?,
         reason = ?,
         remark = ?
     WHERE id = ?`,
    [
      row.alert_status,
      row.purchase_order_id || null,
      row.ordered_qty ?? 0,
      row.received_qty ?? 0,
      row.in_transit_qty ?? 0,
      row.expected_arrival_date || null,
      row.reason || null,
      row.remark || null,
      id,
    ],
  );
}

async function insertPurchaseOrder(conn, row) {
  await conn.query(
    `INSERT INTO purchase_orders
      (id, order_no, supplier_id, status, expected_arrival_date, total_amount, remark, created_by)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.order_no,
      row.supplier_id || null,
      row.status || 'ordered',
      row.expected_arrival_date || null,
      row.total_amount || 0,
      row.remark || null,
      row.created_by || null,
    ],
  );
}

async function insertPurchaseOrderItem(conn, row) {
  await conn.query(
    `INSERT INTO purchase_order_items
      (id, purchase_order_id, variant_id, ordered_qty, received_qty, unit_cost, batch_no,
       production_date, shelf_life_days, expiry_date, supplier_sku)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.purchase_order_id,
      row.variant_id,
      row.ordered_qty,
      row.received_qty || 0,
      row.unit_cost == null ? null : Number(row.unit_cost),
      row.batch_no || null,
      row.production_date || null,
      row.shelf_life_days == null ? null : Number(row.shelf_life_days),
      row.expiry_date || null,
      row.supplier_sku || null,
    ],
  );
}

async function countPurchaseOrders(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM purchase_orders po ${where}`,
    params,
  );
  return total;
}

async function selectPurchaseOrdersPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
       po.*,
       COUNT(poi.id) AS item_count,
       COALESCE(SUM(poi.ordered_qty), 0) AS ordered_qty,
       COALESCE(SUM(poi.received_qty), 0) AS received_qty,
       COALESCE(SUM(GREATEST(poi.ordered_qty - poi.received_qty, 0)), 0) AS in_transit_qty
     FROM purchase_orders po
     LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
     ${where}
     GROUP BY po.id
     ORDER BY po.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectPurchaseOrderById(id) {
  const [rows] = await db.query(
    `SELECT
       po.*,
       COUNT(poi.id) AS item_count,
       COALESCE(SUM(poi.ordered_qty), 0) AS ordered_qty,
       COALESCE(SUM(poi.received_qty), 0) AS received_qty,
       COALESCE(SUM(GREATEST(poi.ordered_qty - poi.received_qty, 0)), 0) AS in_transit_qty
     FROM purchase_orders po
     LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
     WHERE po.id = ?
     GROUP BY po.id
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function selectPurchaseOrderItems(purchaseOrderId) {
  const [rows] = await db.query(
    `SELECT
       poi.*,
       v.product_id,
       v.title AS variant_title,
       v.sku_code,
       COALESCE(v.unit_name, '件') AS unit_name,
       p.name AS product_name
     FROM purchase_order_items poi
     JOIN product_variants v ON v.id = poi.variant_id
     JOIN products p ON p.id = v.product_id
     WHERE poi.purchase_order_id = ?
     ORDER BY poi.created_at ASC`,
    [purchaseOrderId],
  );
  return rows;
}

async function selectPurchaseOrderItemsForUpdate(conn, purchaseOrderId) {
  const [rows] = await conn.query(
    `SELECT
       poi.*,
       po.order_no,
       po.status AS purchase_status,
       v.product_id,
       v.title AS variant_title,
       v.sku_code,
       v.stock,
       v.cost_price,
       COALESCE(v.stock_warning_threshold, 5) AS stock_warning_threshold,
       p.name AS product_name
     FROM purchase_order_items poi
     JOIN purchase_orders po ON po.id = poi.purchase_order_id
     JOIN product_variants v ON v.id = poi.variant_id
     JOIN products p ON p.id = v.product_id
     WHERE poi.purchase_order_id = ?
     ORDER BY poi.created_at ASC
     FOR UPDATE`,
    [purchaseOrderId],
  );
  return rows;
}

async function updatePurchaseOrderItemReceived(conn, id, receivedQty) {
  await conn.query(
    'UPDATE purchase_order_items SET received_qty = ?, updated_at = NOW() WHERE id = ?',
    [receivedQty, id],
  );
}

async function updatePurchaseOrderStatus(conn, id, status, actualArrivalDate = null) {
  await conn.query(
    `UPDATE purchase_orders
     SET status = ?, actual_arrival_date = COALESCE(?, actual_arrival_date), updated_at = NOW()
     WHERE id = ?`,
    [status, actualArrivalDate, id],
  );
}

async function selectVariantReplenishmentSnapshot(conn, variantId) {
  const q = conn || db;
  const [rows] = await q.query(
    `SELECT
       v.id AS variant_id,
       v.product_id,
       p.name AS product_name,
       v.title AS variant_title,
       v.sku_code,
       v.stock AS current_stock,
       COALESCE(v.reserved_stock, 0) AS reserved_stock,
       GREATEST(v.stock - COALESCE(v.reserved_stock, 0), 0) AS available_stock,
       COALESCE(v.stock_lower_limit, v.stock_warning_threshold, 5) AS warning_stock,
       COALESCE(v.stock_lower_limit, v.stock_warning_threshold, 5) AS lower_limit,
       v.stock_upper_limit AS upper_limit,
       COALESCE(poagg.ordered_qty, 0) AS ordered_qty,
       COALESCE(poagg.received_qty, 0) AS received_qty,
       COALESCE(poagg.in_transit_qty, 0) AS in_transit_qty,
       poagg.purchase_order_id,
       poagg.expected_arrival_date,
       pr.id AS unpack_rule_id,
       pr.parent_variant_id AS unpack_parent_variant_id,
       pr.child_qty AS unpack_child_qty,
       pr.parent_qty AS unpack_parent_qty,
       GREATEST(COALESCE(pv.stock, 0) - COALESCE(pv.reserved_stock, 0), 0) AS unpack_parent_available_stock
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN inventory_pack_rules pr ON pr.child_variant_id = v.id
       AND pr.deleted_at IS NULL
       AND pr.enabled = 1
       AND pr.manual_unpack_enabled = 1
     LEFT JOIN product_variants pv ON pv.id = pr.parent_variant_id
       AND pv.deleted_at IS NULL
       AND pv.enabled = 1
     LEFT JOIN (
       SELECT
         poi.variant_id,
         SUM(poi.ordered_qty) AS ordered_qty,
         SUM(poi.received_qty) AS received_qty,
         SUM(GREATEST(poi.ordered_qty - poi.received_qty, 0)) AS in_transit_qty,
         MIN(po.expected_arrival_date) AS expected_arrival_date,
         SUBSTRING_INDEX(GROUP_CONCAT(po.id ORDER BY po.expected_arrival_date IS NULL, po.expected_arrival_date ASC, po.created_at ASC), ',', 1) AS purchase_order_id
       FROM purchase_order_items poi
       JOIN purchase_orders po ON po.id = poi.purchase_order_id
       WHERE po.status IN (${placeholders(IN_TRANSIT_PO_STATUSES)})
       GROUP BY poi.variant_id
     ) poagg ON poagg.variant_id = v.id
     WHERE v.id = ?`,
    [...IN_TRANSIT_PO_STATUSES, variantId],
  );
  return rows[0] || null;
}

async function countAlerts(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM inventory_replenishment_alerts a
     JOIN product_variants v ON v.id = a.variant_id
     JOIN products p ON p.id = v.product_id
     ${where}`,
    params,
  );
  return total;
}

async function selectAlertsPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
       a.*,
       p.id AS product_id,
       p.name AS product_name,
       p.cover_image,
       v.title AS variant_title,
       v.sku_code,
       v.stock,
       COALESCE(v.reserved_stock, 0) AS reserved_stock,
       COALESCE(v.unit_name, '件') AS unit_name,
       po.order_no AS purchase_order_no,
       po.status AS purchase_order_status
     FROM inventory_replenishment_alerts a
     JOIN product_variants v ON v.id = a.variant_id
     JOIN products p ON p.id = v.product_id
     LEFT JOIN purchase_orders po ON po.id = a.purchase_order_id
     ${where}
     ORDER BY
       FIELD(a.alert_status, 'pending', 'suggested', 'overdue', 'partial_received', 'ordered', 'in_transit', 'snoozed', 'ignored', 'resolved', 'cancelled'),
       a.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectSmartLimitCandidates(conn, variantIds = []) {
  const q = conn || db;
  const ids = [...new Set((variantIds || []).filter(Boolean))];
  const whereIds = ids.length ? `AND v.id IN (${ids.map(() => '?').join(',')})` : '';
  const [rows] = await q.query(
    `SELECT
       v.id AS variant_id,
       v.product_id,
       p.name AS product_name,
       v.title AS variant_title,
       v.sku_code,
       v.stock AS current_stock,
       COALESCE(v.reserved_stock, 0) AS reserved_stock,
       GREATEST(v.stock - COALESCE(v.reserved_stock, 0), 0) AS available_stock,
       v.stock_lower_limit,
       v.stock_upper_limit,
       COALESCE(poagg.in_transit_qty, 0) AS in_transit_qty,
       pr.id AS unpack_rule_id,
       pr.parent_variant_id AS unpack_parent_variant_id,
       pr.child_qty AS unpack_child_qty,
       pr.parent_qty AS unpack_parent_qty,
       GREATEST(COALESCE(pv.stock, 0) - COALESCE(pv.reserved_stock, 0), 0) AS unpack_parent_available_stock
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN (
       SELECT poi.variant_id, SUM(GREATEST(poi.ordered_qty - poi.received_qty, 0)) AS in_transit_qty
       FROM purchase_order_items poi
       JOIN purchase_orders po ON po.id = poi.purchase_order_id
       WHERE po.status IN (${placeholders(IN_TRANSIT_PO_STATUSES)})
       GROUP BY poi.variant_id
     ) poagg ON poagg.variant_id = v.id
     LEFT JOIN inventory_pack_rules pr
       ON pr.child_variant_id = v.id
      AND pr.deleted_at IS NULL
      AND pr.enabled = 1
      AND pr.manual_unpack_enabled = 1
     LEFT JOIN product_variants pv
       ON pv.id = pr.parent_variant_id
      AND pv.deleted_at IS NULL
      AND pv.enabled = 1
     WHERE p.deleted_at IS NULL
       AND v.deleted_at IS NULL
       AND v.enabled = 1
       ${whereIds}
     ORDER BY p.name ASC, v.sort_order ASC`,
    [...IN_TRANSIT_PO_STATUSES, ...ids],
  );
  return rows;
}

async function selectDailySnapshotStats(conn, variantIds, analysisDays) {
  const q = conn || db;
  const ids = [...new Set((variantIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  const [rows] = await q.query(
    `SELECT
       variant_id,
       COUNT(*) AS snapshot_days,
       SUM(sales_qty) AS sales_qty,
       SUM(CASE WHEN is_stockout = 1 THEN 1 ELSE 0 END) AS stockout_days
     FROM inventory_daily_snapshots
     WHERE variant_id IN (${ids.map(() => '?').join(',')})
       AND snapshot_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY variant_id`,
    [...ids, analysisDays],
  );
  return new Map(rows.map((row) => [row.variant_id, row]));
}

async function selectReplenishmentProfilesByVariantIds(conn, variantIds) {
  const ids = [...new Set((variantIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  const q = conn || db;
  const [rows] = await q.query(
    `SELECT *
     FROM inventory_replenishment_profiles
     WHERE variant_id IN (${placeholders(ids)})`,
    ids,
  );
  return new Map(rows.map((row) => [row.variant_id, row]));
}

async function upsertReplenishmentProfiles(conn, rows) {
  if (!rows.length) return { affectedRows: 0 };
  const values = [];
  const params = [];
  for (const row of rows) {
    values.push('(?,?,?,?,?,?,?,?,?,?,?,?,?)');
    params.push(
      row.id,
      row.variant_id,
      row.auto_limit_enabled ? 1 : 0,
      row.analysis_days,
      row.lead_time_days,
      row.safety_stock_days,
      row.target_cover_days,
      row.min_floor_stock,
      row.purchase_multiple,
      row.exclude_promotion_sales ? 1 : 0,
      row.exclude_stockout_days ? 1 : 0,
      row.strategy,
      row.updated_by || null,
    );
  }
  const [result] = await conn.query(
    `INSERT INTO inventory_replenishment_profiles
       (id, variant_id, auto_limit_enabled, analysis_days, lead_time_days, safety_stock_days,
        target_cover_days, min_floor_stock, purchase_multiple, exclude_promotion_sales,
        exclude_stockout_days, strategy, updated_by)
     VALUES ${values.join(',')}
     ON DUPLICATE KEY UPDATE
       auto_limit_enabled = VALUES(auto_limit_enabled),
       analysis_days = VALUES(analysis_days),
       lead_time_days = VALUES(lead_time_days),
       safety_stock_days = VALUES(safety_stock_days),
       target_cover_days = VALUES(target_cover_days),
       min_floor_stock = VALUES(min_floor_stock),
       purchase_multiple = VALUES(purchase_multiple),
       exclude_promotion_sales = VALUES(exclude_promotion_sales),
       exclude_stockout_days = VALUES(exclude_stockout_days),
       strategy = VALUES(strategy),
       updated_by = VALUES(updated_by),
       updated_at = CURRENT_TIMESTAMP`,
    params,
  );
  return result;
}

async function insertReplenishmentRun(conn, row) {
  await conn.query(
    `INSERT INTO inventory_replenishment_runs
       (id, scope_type, scope_snapshot, analysis_days, strategy, status, created_by)
     VALUES (?,?,?,?,?,?,?)`,
    [
      row.id,
      row.scope_type,
      row.scope_snapshot ? JSON.stringify(row.scope_snapshot) : null,
      row.analysis_days,
      row.strategy,
      row.status || 'preview',
      row.created_by || null,
    ],
  );
}

async function insertReplenishmentRunItem(conn, row) {
  await conn.query(
    `INSERT INTO inventory_replenishment_run_items
       (id, run_id, variant_id, old_lower_limit, old_upper_limit, suggested_lower_limit, suggested_upper_limit,
        current_stock, available_stock, in_transit_qty, sales_qty, saleable_days, avg_daily_sales,
        suggested_replenishment_qty, confidence_score, suggestion_type, suggestion_payload, reason, apply_status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.run_id,
      row.variant_id,
      row.old_lower_limit ?? null,
      row.old_upper_limit ?? null,
      row.suggested_lower_limit,
      row.suggested_upper_limit,
      row.current_stock,
      row.available_stock,
      row.in_transit_qty,
      row.sales_qty,
      row.saleable_days,
      row.avg_daily_sales,
      row.suggested_replenishment_qty,
      row.confidence_score,
      row.suggestion_type || 'purchase',
      row.suggestion_payload ? JSON.stringify(row.suggestion_payload) : null,
      row.reason || null,
      row.apply_status || 'pending',
    ],
  );
}

async function selectRunItemsForUpdate(conn, runId, itemIds = []) {
  const ids = [...new Set((itemIds || []).filter(Boolean))];
  const whereIds = ids.length ? `AND i.id IN (${ids.map(() => '?').join(',')})` : '';
  const [rows] = await conn.query(
    `SELECT i.*, v.stock_lower_limit, v.stock_upper_limit
     FROM inventory_replenishment_run_items i
     JOIN product_variants v ON v.id = i.variant_id
     WHERE i.run_id = ? ${whereIds}
     FOR UPDATE`,
    [runId, ...ids],
  );
  return rows;
}

async function updateVariantLimits(conn, variantId, lowerLimit, upperLimit) {
  await conn.query(
    `UPDATE product_variants
     SET stock_lower_limit = ?, stock_upper_limit = ?, stock_warning_threshold = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [lowerLimit, upperLimit, lowerLimit, variantId],
  );
}

async function markRunItemApplied(conn, id, lowerLimit, upperLimit, replenishmentQty) {
  await conn.query(
    `UPDATE inventory_replenishment_run_items
     SET suggested_lower_limit = ?, suggested_upper_limit = ?, suggested_replenishment_qty = ?, apply_status = 'applied'
     WHERE id = ?`,
    [lowerLimit, upperLimit, replenishmentQty, id],
  );
}

async function markRunItemOrdered(conn, id, lowerLimit, upperLimit, replenishmentQty) {
  await conn.query(
    `UPDATE inventory_replenishment_run_items
     SET suggested_lower_limit = ?, suggested_upper_limit = ?, suggested_replenishment_qty = ?, apply_status = 'ordered'
     WHERE id = ?`,
    [lowerLimit, upperLimit, replenishmentQty, id],
  );
}

async function markRunItemStatus(conn, id, status, reason = null) {
  await conn.query(
    `UPDATE inventory_replenishment_run_items
     SET apply_status = ?, reason = COALESCE(?, reason)
     WHERE id = ?`,
    [status, reason, id],
  );
}

async function updateRunStatus(conn, runId, status) {
  await conn.query('UPDATE inventory_replenishment_runs SET status = ? WHERE id = ?', [status, runId]);
}

async function upsertDailyInventorySnapshots(conn, snapshotDate) {
  const q = conn || db;
  const paidStatuses = [...PAID_PAYMENT_STATUS_LIST];
  const startAt = `${snapshotDate} 00:00:00`;
  const nextDay = new Date(`${snapshotDate}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const endAt = `${nextDay.toISOString().slice(0, 10)} 00:00:00`;
  const [result] = await q.query(
    `INSERT INTO inventory_daily_snapshots
       (id, snapshot_date, product_id, variant_id, stock, reserved_stock, available_stock, in_transit_qty, sales_qty, is_stockout)
     SELECT
       UUID() AS id,
       ? AS snapshot_date,
       v.product_id,
       v.id AS variant_id,
       COALESCE(v.stock, 0) AS stock,
       COALESCE(v.reserved_stock, 0) AS reserved_stock,
       GREATEST(COALESCE(v.stock, 0) - COALESCE(v.reserved_stock, 0), 0) AS available_stock,
       COALESCE(poagg.in_transit_qty, 0) AS in_transit_qty,
       COALESCE(sales.sales_qty, 0) AS sales_qty,
       CASE WHEN GREATEST(COALESCE(v.stock, 0) - COALESCE(v.reserved_stock, 0), 0) <= 0 THEN 1 ELSE 0 END AS is_stockout
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN (
       SELECT poi.variant_id, SUM(GREATEST(poi.ordered_qty - poi.received_qty, 0)) AS in_transit_qty
       FROM purchase_order_items poi
       JOIN purchase_orders po ON po.id = poi.purchase_order_id
       WHERE po.status IN (${placeholders(IN_TRANSIT_PO_STATUSES)})
       GROUP BY poi.variant_id
     ) poagg ON poagg.variant_id = v.id
     LEFT JOIN (
       SELECT oi.variant_id, SUM(COALESCE(oi.qty, 0)) AS sales_qty
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.variant_id IS NOT NULL
         AND o.payment_status IN (${placeholders(paidStatuses)})
         AND COALESCE(o.paid_at, o.payment_time, o.created_at) >= ?
         AND COALESCE(o.paid_at, o.payment_time, o.created_at) < ?
       GROUP BY oi.variant_id
     ) sales ON sales.variant_id = v.id
     WHERE p.deleted_at IS NULL
       AND v.deleted_at IS NULL
       AND v.enabled = 1
     ON DUPLICATE KEY UPDATE
       stock = VALUES(stock),
       reserved_stock = VALUES(reserved_stock),
       available_stock = VALUES(available_stock),
       in_transit_qty = VALUES(in_transit_qty),
       sales_qty = VALUES(sales_qty),
       is_stockout = VALUES(is_stockout)`,
    [snapshotDate, ...IN_TRANSIT_PO_STATUSES, ...paidStatuses, startAt, endAt],
  );
  return result;
}

function getConnection() {
  return db.getConnection();
}

module.exports = {
  OPEN_ALERT_STATUSES,
  IN_TRANSIT_PO_STATUSES,
  getConnection,
  selectReplenishmentCandidates,
  selectOpenAlertByVariantId,
  selectAlertByIdForUpdate,
  insertAlert,
  updateAlert,
  updateAlertStatus,
  insertPurchaseOrder,
  insertPurchaseOrderItem,
  countPurchaseOrders,
  selectPurchaseOrdersPage,
  selectPurchaseOrderById,
  selectPurchaseOrderItems,
  selectPurchaseOrderItemsForUpdate,
  updatePurchaseOrderItemReceived,
  updatePurchaseOrderStatus,
  selectVariantReplenishmentSnapshot,
  countAlerts,
  selectAlertsPage,
  selectSmartLimitCandidates,
  selectDailySnapshotStats,
  selectReplenishmentProfilesByVariantIds,
  upsertReplenishmentProfiles,
  insertReplenishmentRun,
  insertReplenishmentRunItem,
  selectRunItemsForUpdate,
  updateVariantLimits,
  markRunItemApplied,
  markRunItemOrdered,
  markRunItemStatus,
  updateRunStatus,
  upsertDailyInventorySnapshots,
};
