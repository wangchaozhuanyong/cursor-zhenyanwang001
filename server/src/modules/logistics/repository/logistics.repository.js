const db = require('../../../config/db');
const { loadSchemaCapabilities } = require('../../../db/schemaContract');

function getPool() {
  return db;
}

async function selectOrderForTracking(orderId) {
  const schema = await loadSchemaCapabilities();
  const snapshotFields = [
    schema.ordersLogisticsStatus ? 'logistics_status' : "'' AS logistics_status",
    schema.ordersLogisticsStatusLabel ? 'logistics_status_label' : "'' AS logistics_status_label",
    schema.ordersLogisticsException ? 'logistics_exception_type' : "'' AS logistics_exception_type",
    schema.ordersLogisticsExceptionMessage ? 'logistics_exception_message' : "'' AS logistics_exception_message",
    schema.ordersLogisticsLatestEvent ? 'logistics_latest_event_at' : 'NULL AS logistics_latest_event_at',
    schema.ordersLogisticsLastSynced ? 'logistics_last_synced_at' : 'NULL AS logistics_last_synced_at',
  ].join(', ');
  const [[row]] = await db.query(
    `SELECT id, order_no, user_id, status, tracking_no, carrier, contact_name,
            contact_phone, address, created_at, ${snapshotFields}
     FROM orders
     WHERE id = ?`,
    [orderId],
  );
  return row || null;
}

async function selectTracksByOrderId(orderId) {
  const schema = await loadSchemaCapabilities();
  const exceptionFields = schema.logisticsTracksException
    ? 'exception_type, severity,'
    : "'' AS exception_type, 'info' AS severity,";
  const [rows] = await db.query(
    `SELECT id, order_id, return_id, return_shipment_id, direction,
            tracking_no, carrier, carrier_code, status, ${exceptionFields} title,
            description, location, event_time, source, created_at, updated_at
     FROM logistics_tracks
     WHERE order_id = ?
     ORDER BY event_time DESC, created_at DESC`,
    [orderId],
  );
  return rows;
}

async function selectTracksByReturnId(returnId) {
  const schema = await loadSchemaCapabilities();
  const exceptionFields = schema.logisticsTracksException
    ? 'exception_type, severity,'
    : "'' AS exception_type, 'info' AS severity,";
  const [rows] = await db.query(
    `SELECT id, order_id, return_id, return_shipment_id, direction,
            tracking_no, carrier, carrier_code, status, ${exceptionFields} title,
            description, location, event_time, source, created_at, updated_at
     FROM logistics_tracks
     WHERE return_id = ?
     ORDER BY event_time DESC, created_at DESC`,
    [returnId],
  );
  return rows;
}

async function replaceAdapterTracks(orderId, trackingNo, carrierCode, events) {
  const schema = await loadSchemaCapabilities();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "DELETE FROM logistics_tracks WHERE order_id = ? AND direction = 'order_shipping' AND source = 'adapter'",
      [orderId],
    );

    for (const event of events) {
      const extraColumns = schema.logisticsTracksException ? ', exception_type, severity' : '';
      const extraPlaceholders = schema.logisticsTracksException ? ', ?, ?' : '';
      const extraValues = schema.logisticsTracksException
        ? [event.exceptionType || event.exception_type || '', event.severity || 'info']
        : [];
      await conn.query(
        `INSERT INTO logistics_tracks
           (id, order_id, direction, tracking_no, carrier, carrier_code, status, title,
            description, location, event_time, source, raw_data${extraColumns})
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?${extraPlaceholders})`,
        [
          event.id,
          orderId,
          'order_shipping',
          trackingNo || '',
          event.carrier || '',
          carrierCode || '',
          event.status,
          event.title,
          event.description || '',
          event.location || '',
          event.eventTime,
          'adapter',
          JSON.stringify(event.raw || {}),
          ...extraValues,
        ],
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function replaceAdapterReturnShipmentTracks(shipment, carrierCode, events) {
  const schema = await loadSchemaCapabilities();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "DELETE FROM logistics_tracks WHERE return_shipment_id = ? AND source = 'adapter'",
      [shipment.id],
    );

    for (const event of events) {
      const extraColumns = schema.logisticsTracksException ? ', exception_type, severity' : '';
      const extraPlaceholders = schema.logisticsTracksException ? ', ?, ?' : '';
      const extraValues = schema.logisticsTracksException
        ? [event.exceptionType || event.exception_type || '', event.severity || 'info']
        : [];
      await conn.query(
        `INSERT INTO logistics_tracks
           (id, order_id, return_id, return_shipment_id, direction,
            tracking_no, carrier, carrier_code, status, title,
            description, location, event_time, source, raw_data${extraColumns})
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?${extraPlaceholders})`,
        [
          event.id,
          shipment.order_id,
          shipment.return_id,
          shipment.id,
          shipment.direction || 'buyer_return',
          shipment.tracking_no || '',
          event.carrier || shipment.carrier || '',
          carrierCode || '',
          event.status,
          event.title,
          event.description || '',
          event.location || '',
          event.eventTime,
          'adapter',
          JSON.stringify(event.raw || {}),
          ...extraValues,
        ],
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function insertManualOrderTrack(orderId, event) {
  const schema = await loadSchemaCapabilities();
  const extraColumns = schema.logisticsTracksException ? ', exception_type, severity' : '';
  const extraPlaceholders = schema.logisticsTracksException ? ', ?, ?' : '';
  const extraUpdates = schema.logisticsTracksException
    ? ', exception_type = VALUES(exception_type), severity = VALUES(severity)'
    : '';
  const extraValues = schema.logisticsTracksException
    ? [event.exceptionType || event.exception_type || '', event.severity || 'info']
    : [];
  await db.query(
    `INSERT INTO logistics_tracks
       (id, order_id, direction, tracking_no, carrier, carrier_code, status, title,
        description, location, event_time, source, raw_data${extraColumns})
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?${extraPlaceholders})
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       description = VALUES(description),
       location = VALUES(location),
       source = VALUES(source),
       raw_data = VALUES(raw_data)
       ${extraUpdates}`,
    [
      event.id,
      orderId,
      event.direction || 'order_shipping',
      event.trackingNo || event.tracking_no || '',
      event.carrier || '',
      event.carrierCode || event.carrier_code || '',
      event.status || 'shipped',
      event.title || '',
      event.description || '',
      event.location || '',
      event.eventTime,
      'manual',
      JSON.stringify(event.raw || {}),
      ...extraValues,
    ],
  );
}

async function updateOrderLogisticsSnapshot(orderId, snapshot = {}) {
  const schema = await loadSchemaCapabilities();
  const set = [];
  const params = [];
  if (schema.ordersLogisticsStatus) {
    set.push('logistics_status = ?');
    params.push(snapshot.status || '');
  }
  if (schema.ordersLogisticsStatusLabel) {
    set.push('logistics_status_label = ?');
    params.push(snapshot.statusLabel || snapshot.status_label || '');
  }
  if (schema.ordersLogisticsException) {
    set.push('logistics_exception_type = ?');
    params.push(snapshot.exceptionType || snapshot.exception_type || '');
  }
  if (schema.ordersLogisticsExceptionMessage) {
    set.push('logistics_exception_message = ?');
    params.push(snapshot.exceptionMessage || snapshot.exception_message || '');
  }
  if (schema.ordersLogisticsLatestEvent) {
    set.push('logistics_latest_event_at = ?');
    params.push(snapshot.latestEventAt || snapshot.latest_event_at || null);
  }
  if (schema.ordersLogisticsLastSynced) {
    set.push('logistics_last_synced_at = NOW()');
  }
  if (!set.length) return 0;
  params.push(orderId);
  const [result] = await db.query(`UPDATE orders SET ${set.join(', ')} WHERE id = ?`, params);
  return result.affectedRows || 0;
}

module.exports = {
  getPool,
  selectOrderForTracking,
  selectTracksByOrderId,
  selectTracksByReturnId,
  replaceAdapterTracks,
  replaceAdapterReturnShipmentTracks,
  insertManualOrderTrack,
  updateOrderLogisticsSnapshot,
};
