const db = require('../../../config/db');

async function getConnection() {
  return db.getConnection();
}

async function selectUserForExport(userId) {
  const [[row]] = await db.query(
    `SELECT id, phone, nickname, avatar, invite_code, parent_invite_code,
            points_balance, subordinate_enabled, role, wechat, whatsapp, created_at
     FROM users
     WHERE id = ? AND deleted_at IS NULL`,
    [userId],
  );
  return row || null;
}

async function selectAddressesForExport(userId) {
  const [rows] = await db.query(
    `SELECT id, name, phone, address, is_default, created_at
     FROM addresses
     WHERE user_id = ?
     ORDER BY is_default DESC, created_at DESC`,
    [userId],
  );
  return rows;
}

async function selectOrdersForExport(userId) {
  const [orders] = await db.query(
    `SELECT id, order_no, raw_amount, discount_amount, coupon_title, shipping_fee,
            shipping_name, total_amount, total_points, status, payment_status,
            payment_time, payment_channel, payment_transaction_no, tracking_no,
            carrier, note, contact_name, contact_phone, address, payment_method, created_at
     FROM orders
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );
  if (!orders.length) return [];

  const orderIds = orders.map((order) => order.id);
  const [items] = await db.query(
    `SELECT id, order_id, product_id, product_name, product_image, price, points, qty
     FROM order_items
     WHERE order_id IN (${orderIds.map(() => '?').join(',')})
     ORDER BY order_id ASC, id ASC`,
    orderIds,
  );
  const itemsByOrder = new Map();
  items.forEach((item) => {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  });

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) || [],
  }));
}

async function selectPointsRecordsForExport(userId) {
  const [rows] = await db.query(
    `SELECT id, action, amount, description, created_at
     FROM points_records
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

async function selectUserForDeletion(conn, userId) {
  const [[row]] = await conn.query(
    'SELECT id, phone, nickname, avatar, wechat, whatsapp, deleted_at FROM users WHERE id = ? FOR UPDATE',
    [userId],
  );
  return row || null;
}

async function anonymizeUser(conn, userId, anonymizedPhone, anonymizedInviteCode, anonymizedPasswordHash) {
  const [result] = await conn.query(
    `UPDATE users
     SET phone = ?,
         password_hash = ?,
         nickname = '已注销用户',
         avatar = '',
         wechat = '',
         whatsapp = '',
         invite_code = ?,
         parent_invite_code = '',
         role = 'user_disabled',
         refresh_token_version = refresh_token_version + 1,
         deleted_at = NOW()
     WHERE id = ? AND deleted_at IS NULL`,
    [anonymizedPhone, anonymizedPasswordHash, anonymizedInviteCode, userId],
  );
  return result.affectedRows || 0;
}

async function anonymizeOrders(conn, userId) {
  const [result] = await conn.query(
    `UPDATE orders
     SET contact_name = '已匿�?,
         contact_phone = '',
         address = '已匿�?,
         note = ''
     WHERE user_id = ?`,
    [userId],
  );
  return result.affectedRows || 0;
}

async function deleteAddresses(conn, userId) {
  const [result] = await conn.query('DELETE FROM addresses WHERE user_id = ?', [userId]);
  return result.affectedRows || 0;
}

module.exports = {
  getConnection,
  selectUserForExport,
  selectAddressesForExport,
  selectOrdersForExport,
  selectPointsRecordsForExport,
  selectUserForDeletion,
  anonymizeUser,
  anonymizeOrders,
  deleteAddresses,
};



