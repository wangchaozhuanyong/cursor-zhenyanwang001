const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');

function getPool() {
  return db;
}

function buildShippingAddress(order) {
  const parts = [
    order.address_line1,
    order.address_line2,
    order.address_city,
    order.address_state,
    order.address_postcode,
    order.address_country,
  ].map((v) => String(v || '').trim()).filter(Boolean);
  return parts.length ? parts.join(', ') : String(order.address || '').trim();
}

async function selectTelegramOrderSnapshot(orderId) {
  const [[order]] = await db.query(
    `SELECT id, user_id, order_no, contact_name, contact_phone, shipping_phone,
            total_amount, payment_method, payment_channel, payment_status, status,
            address, address_line1, address_line2, address_city, address_state,
            address_postcode, address_country, created_at, paid_at, payment_time
       FROM orders
      WHERE id = ?`,
    [orderId],
  );
  if (!order) return null;

  const [items] = await db.query(
    `SELECT oi.id, oi.product_id, oi.variant_id,
            COALESCE(NULLIF(oi.product_name_snapshot, ''), NULLIF(oi.product_name, ''), p.name, '') AS product_name,
            COALESCE(NULLIF(oi.variant_name, ''), NULLIF(pv.title, ''), '默认规格') AS sku_name,
            COALESCE(NULLIF(oi.sku_code, ''), pv.sku_code, '') AS sku_code,
            oi.qty AS quantity,
            oi.price AS unit_price,
            oi.subtotal AS line_total
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC`,
    [orderId],
  );

  return {
    order: {
      id: order.id,
      orderNo: order.order_no,
      customerName: order.contact_name || '客户',
      contactPhone: order.contact_phone || order.shipping_phone || '',
      shippingAddress: buildShippingAddress(order),
      totalAmount: order.total_amount,
      paymentMethod: order.payment_method || '',
      paymentChannel: order.payment_channel || '',
      paymentStatus: order.payment_status || '',
      status: order.status || '',
      createdAt: order.created_at,
      paidAt: order.paid_at || order.payment_time,
    },
    items: items.map((item) => ({
      productName: item.product_name || '未命名商品',
      skuName: item.sku_name || '默认规格',
      skuCode: item.sku_code || '',
      quantity: Number(item.quantity || 0),
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
  };
}

async function hasSentTelegramEvent(orderId, eventType) {
  const [[row]] = await db.query(
    `SELECT id
       FROM notification_logs
      WHERE channel = 'telegram'
        AND order_id = ?
        AND event_type = ?
        AND send_status = 'sent'
      LIMIT 1`,
    [orderId, eventType],
  );
  return !!row;
}

async function insertNotificationLog(payload) {
  const id = payload.id || generateId();
  await db.query(
    `INSERT INTO notification_logs
       (id, channel, target_type, target_id, order_id, event_type,
        message_content, send_status, provider_message_id, error_message)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      payload.channel || 'telegram',
      payload.targetType || 'admin_group',
      payload.targetId || '',
      payload.orderId || null,
      payload.eventType || '',
      payload.messageContent || '',
      payload.sendStatus || 'pending',
      payload.providerMessageId || '',
      payload.errorMessage || '',
    ],
  );
  return id;
}

async function listTelegramLogs(limit = 20) {
  const n = Math.min(100, Math.max(1, Number(limit) || 20));
  const [rows] = await db.query(
    `SELECT id, target_type, target_id, order_id, event_type, send_status,
            provider_message_id, error_message, created_at, updated_at
       FROM notification_logs
      WHERE channel = 'telegram'
      ORDER BY created_at DESC
      LIMIT ?`,
    [n],
  );
  return rows;
}

module.exports = {
  getPool,
  selectTelegramOrderSnapshot,
  hasSentTelegramEvent,
  insertNotificationLog,
  listTelegramLogs,
};
