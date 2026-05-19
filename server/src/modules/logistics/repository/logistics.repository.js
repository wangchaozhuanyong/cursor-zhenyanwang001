const db = require('../../../config/db');

function getPool() {
  return db;
}

async function selectOrderForTracking(orderId) {
  const [[row]] = await db.query(
    `SELECT id, order_no, user_id, status, tracking_no, carrier, contact_name,
            contact_phone, address, created_at
     FROM orders
     WHERE id = ?`,
    [orderId],
  );
  return row || null;
}

async function selectTracksByOrderId(orderId) {
  const [rows] = await db.query(
    `SELECT id, order_id, tracking_no, carrier, carrier_code, status, title,
            description, location, event_time, source, created_at, updated_at
     FROM logistics_tracks
     WHERE order_id = ?
     ORDER BY event_time DESC, created_at DESC`,
    [orderId],
  );
  return rows;
}

async function replaceAdapterTracks(orderId, trackingNo, carrierCode, events) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "DELETE FROM logistics_tracks WHERE order_id = ? AND source = 'adapter'",
      [orderId],
    );

    for (const event of events) {
      await conn.query(
        `INSERT INTO logistics_tracks
           (id, order_id, tracking_no, carrier, carrier_code, status, title,
            description, location, event_time, source, raw_data)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          event.id,
          orderId,
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

module.exports = {
  getPool,
  selectOrderForTracking,
  selectTracksByOrderId,
  replaceAdapterTracks,
};
