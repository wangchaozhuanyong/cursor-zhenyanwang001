const db = require('../../config/db');
const { ORDER_STATUS } = require('../../constants/status');

/**
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} q
 */
async function selectOrderItemsWithProduct(q, orderId) {
  const [items] = await q.query(
    `SELECT oi.*, p.name, p.cover_image, p.price AS unit_price
     FROM order_items oi JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderId],
  );
  return items;
}

async function countOrdersAdmin(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);
  return total;
}

async function selectOrdersAdminPage(where, params, pageSize, offset) {
  const [orders] = await db.query(
    `SELECT o.* FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return orders;
}

async function selectOrdersForExport(where, params) {
  const [orders] = await db.query(
    `SELECT o.* FROM orders o ${where} ORDER BY o.created_at DESC`,
    params,
  );
  return orders;
}

async function selectOrderById(q, orderId) {
  const pool = q || db;
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return order || null;
}

/** @returns {Promise<{ status: string; payment_status: string } | null>} */
async function selectOrderStateById(orderId) {
  const [[row]] = await db.query(
    'SELECT status, payment_status FROM orders WHERE id = ?',
    [orderId],
  );
  return row || null;
}

async function updateOrderShipped(orderId, trackingNo, carrier) {
  await db.query(
    'UPDATE orders SET status = ?, tracking_no = ?, carrier = ? WHERE id = ?',
    [ORDER_STATUS.SHIPPED, trackingNo, carrier, orderId],
  );
}

async function selectOrderItemsBatch(orderIds) {
  if (!orderIds.length) return [];
  const placeholders = orderIds.map(() => '?').join(',');
  const [items] = await db.query(
    `SELECT oi.*, p.name, p.cover_image, p.price AS unit_price
     FROM order_items oi JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id IN (${placeholders})`,
    orderIds,
  );
  return items;
}

module.exports = {
  selectOrderItemsWithProduct,
  selectOrderItemsBatch,
  countOrdersAdmin,
  selectOrdersAdminPage,
  selectOrdersForExport,
  selectOrderById,
  selectOrderStateById,
  updateOrderShipped,
};
