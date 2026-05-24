const db = require('../../../config/db');

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
       COALESCE(v.stock_warning_threshold, 5) AS warning_stock,
       COALESCE(poagg.ordered_qty, 0) AS ordered_qty,
       COALESCE(poagg.received_qty, 0) AS received_qty,
       COALESCE(poagg.in_transit_qty, 0) AS in_transit_qty,
       poagg.purchase_order_id,
       poagg.expected_arrival_date
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
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
       AND GREATEST(v.stock - COALESCE(v.reserved_stock, 0), 0) <= COALESCE(v.stock_warning_threshold, 5)`,
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
       ordered_qty, received_qty, in_transit_qty, purchase_order_id, expected_arrival_date, last_alert_at, reason, remark)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?)`,
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
         remark = ?
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
       COALESCE(v.stock_warning_threshold, 5) AS warning_stock,
       COALESCE(poagg.ordered_qty, 0) AS ordered_qty,
       COALESCE(poagg.received_qty, 0) AS received_qty,
       COALESCE(poagg.in_transit_qty, 0) AS in_transit_qty,
       poagg.purchase_order_id,
       poagg.expected_arrival_date
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
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
};
