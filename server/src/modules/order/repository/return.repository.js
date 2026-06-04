const db = require('../../../config/db');
const { ACTIVE_RETURN_STATUS_LIST, ACTIVE_RETURN_SQL_IN } = require('../orderAfterSale');

async function countReturnRequests(userId, status) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM return_requests ${where}`, params);
  return total;
}

async function selectReturnRequestsPage(userId, status, pageSize, offset) {
  let where = 'WHERE rr.user_id = ?';
  const params = [userId];
  if (status) {
    where += ' AND rr.status = ?';
    params.push(status);
  }
  const [rows] = await db.query(
    `SELECT rr.*,
            COALESCE(oi.product_name_snapshot, oi.product_name, p.name, '') AS product_name,
            COALESCE(oi.variant_name_snapshot, oi.variant_name, '') AS variant_name,
            COALESCE(oi.product_image_snapshot, oi.variant_image_snapshot, oi.product_image, p.cover_image, '') AS product_image,
            COALESCE(oi.qty, 0) AS purchased_qty,
            COALESCE(oi.price, 0) AS unit_price
       FROM return_requests rr
       LEFT JOIN order_items oi ON oi.id = rr.order_item_id
       LEFT JOIN products p ON p.id = rr.product_id
      ${where}
      ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectReturnByIdAndUser(returnId, userId) {
  const [[row]] = await db.query(
    `SELECT rr.*,
            COALESCE(oi.product_name_snapshot, oi.product_name, p.name, '') AS product_name,
            COALESCE(oi.variant_name_snapshot, oi.variant_name, '') AS variant_name,
            COALESCE(oi.product_image_snapshot, oi.variant_image_snapshot, oi.product_image, p.cover_image, '') AS product_image,
            COALESCE(oi.qty, 0) AS purchased_qty,
            COALESCE(oi.price, 0) AS unit_price,
            o.total_amount AS order_total_amount,
            o.status AS order_status,
            o.payment_status AS order_payment_status,
            o.refund_status AS order_refund_status,
            o.refunded_amount AS order_refunded_amount
       FROM return_requests rr
       LEFT JOIN order_items oi ON oi.id = rr.order_item_id
       LEFT JOIN products p ON p.id = rr.product_id
       LEFT JOIN orders o ON o.id = rr.order_id
      WHERE rr.id = ? AND rr.user_id = ?`,
    [returnId, userId],
  );
  return row || null;
}

async function selectOrderForReturn(orderId, userId) {
  const [[row]] = await db.query(
    'SELECT id, order_no, status FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId],
  );
  return row || null;
}

async function selectOrderItemForReturn(orderId, orderItemId) {
  const [[row]] = await db.query(
    `SELECT id, order_id, product_id, variant_id, sku_code, qty,
            product_name, product_image, variant_name,
            product_name_snapshot, product_image_snapshot, variant_image_snapshot, variant_name_snapshot
     FROM order_items
     WHERE id = ? AND order_id = ?`,
    [orderItemId, orderId],
  );
  return row || null;
}

async function countActiveReturnRequests(orderId, userId, orderItemId) {
  const itemClause = orderItemId ? ' AND order_item_id = ?' : '';
  const params = orderItemId ? [orderId, userId, orderItemId] : [orderId, userId];
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM return_requests
      WHERE order_id = ? AND user_id = ?${itemClause}
        AND status IN (${ACTIVE_RETURN_SQL_IN})`,
    [...params, ...ACTIVE_RETURN_STATUS_LIST],
  );
  return Number(rows?.[0]?.total || 0);
}

async function selectReturnSummaryByOrderIds(userId, orderIds = []) {
  if (!orderIds.length) return [];
  const placeholders = orderIds.map(() => '?').join(', ');
  const [rows] = await db.query(
    `SELECT rr.order_id,
            COUNT(*) AS return_request_count,
            SUM(CASE WHEN rr.status IN (${ACTIVE_RETURN_SQL_IN}) THEN 1 ELSE 0 END) AS active_return_count
     FROM return_requests rr
     WHERE rr.user_id = ? AND rr.order_id IN (${placeholders})
     GROUP BY rr.order_id`,
    [...ACTIVE_RETURN_STATUS_LIST, userId, ...orderIds],
  );
  return rows;
}

async function insertReturnRequest(params) {
  const {
    id, userId, orderId, orderNo, orderItemId, productId, variantId, skuCode,
    quantity, type, reason, description, imagesJson, status, contactPhone,
  } = params;
  await db.query(
    `INSERT INTO return_requests
       (id, user_id, order_id, order_no, order_item_id, product_id, variant_id, sku_code,
        quantity, type, reason, description, images, status, contact_phone)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, userId, orderId, orderNo, orderItemId || null, productId || null, variantId || null,
      skuCode || '', quantity || 1, type, reason, description, imagesJson, status, contactPhone || '',
    ],
  );
}

async function selectReturnById(returnId) {
  const [[row]] = await db.query('SELECT * FROM return_requests WHERE id = ?', [returnId]);
  return row || null;
}

async function updateReturnRequestByUser(returnId, userId, setFragments, values) {
  const [result] = await db.query(
    `UPDATE return_requests SET ${setFragments.join(', ')} WHERE id = ? AND user_id = ?`,
    [...values, returnId, userId],
  );
  return result?.affectedRows || 0;
}

async function selectReturnEvents(returnId, userId) {
  const [rows] = await db.query(
    `SELECT *
       FROM return_events
      WHERE return_id = ?
        AND (user_id = ? OR user_id IS NULL)
        AND visible_to_user = 1
      ORDER BY created_at ASC`,
    [returnId, userId],
  );
  return rows;
}

async function selectReturnShipments(returnId) {
  const [rows] = await db.query(
    `SELECT *
       FROM return_shipments
      WHERE return_id = ?
      ORDER BY created_at ASC`,
    [returnId],
  );
  return rows;
}

async function insertReturnEventWithRunner(runner, params) {
  const {
    id, returnId, userId, actorType, actorId, eventType, fromStatus, toStatus,
    title, note, payloadJson, visibleToUser = 1,
  } = params;
  await runner.query(
    `INSERT INTO return_events
       (id, return_id, user_id, actor_type, actor_id, event_type, from_status, to_status,
        title, note, payload, visible_to_user)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, returnId, userId || null, actorType || 'system', actorId || null, eventType || 'note',
      fromStatus || null, toStatus || null, title || '', note || null, payloadJson || null,
      visibleToUser ? 1 : 0,
    ],
  );
}

async function insertReturnEvent(params) {
  await insertReturnEventWithRunner(db, params);
}

async function insertReturnEventConn(conn, params) {
  await insertReturnEventWithRunner(conn, params);
}

async function insertReturnShipment(params) {
  const {
    id, returnId, direction, carrier, trackingNo, contactPhone, note, createdByType, createdBy,
  } = params;
  await db.query(
    `INSERT INTO return_shipments
       (id, return_id, direction, carrier, tracking_no, contact_phone, note, created_by_type, created_by)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      id, returnId, direction || 'buyer_return', carrier || '', trackingNo || '',
      contactPhone || '', note || null, createdByType || 'user', createdBy || null,
    ],
  );
}

module.exports = {
  countReturnRequests,
  selectReturnRequestsPage,
  selectReturnByIdAndUser,
  selectOrderForReturn,
  selectOrderItemForReturn,
  countActiveReturnRequests,
  insertReturnRequest,
  selectReturnById,
  selectReturnSummaryByOrderIds,
  updateReturnRequestByUser,
  selectReturnEvents,
  selectReturnShipments,
  insertReturnEvent,
  insertReturnEventConn,
  insertReturnShipment,
};
