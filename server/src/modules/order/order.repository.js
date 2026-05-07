/**
 * 订单域数据访问（SQL 集中于此，便于审计与单测 mock）
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} q
 */
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../constants/status');

async function selectProductsForUpdate(q, productIds) {
  if (!productIds.length) return [];
  const [rows] = await q.query(
    `SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')}) AND status = 'active' FOR UPDATE`,
    productIds,
  );
  return rows;
}

async function selectShippingTemplate(q, id) {
  const [[row]] = await q.query('SELECT * FROM shipping_templates WHERE id = ? AND enabled = 1', [id]);
  return row || null;
}

async function selectUserCouponForUpdate(q, ucId, userId) {
  const [[row]] = await q.query(
    `SELECT uc.id AS uc_id, c.* FROM user_coupons uc
     JOIN coupons c ON uc.coupon_id = c.id
     WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'available'
       AND c.end_date >= CURDATE() AND c.start_date <= CURDATE()
       AND c.status = 'available'
     FOR UPDATE`,
    [ucId, userId],
  );
  return row || null;
}

async function selectCouponCategoryIds(q, couponId) {
  const [rows] = await q.query(
    'SELECT category_id FROM coupon_categories WHERE coupon_id = ?',
    [couponId],
  );
  return rows.map((r) => r.category_id).filter(Boolean);
}

async function updateUserCouponUsed(q, ucId) {
  await q.query("UPDATE user_coupons SET status = 'used', used_at = NOW() WHERE id = ?", [ucId]);
}

async function insertOrder(q, params) {
  const {
    id, userId, orderNo, rawAmount, discountAmount, couponTitle,
    shippingFee, shippingName, totalAmount, totalPoints,
    note, contactName, contactPhone, address, paymentMethod,
  } = params;
  await q.query(
    `INSERT INTO orders
       (id, user_id, order_no, raw_amount, discount_amount, coupon_title,
        shipping_fee, shipping_name, total_amount, total_points, status, payment_status,
        note, contact_name, contact_phone, address, payment_method)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, userId, orderNo, rawAmount, discountAmount, couponTitle || '',
      shippingFee,
      shippingName || '',
      totalAmount,
      totalPoints,
      ORDER_STATUS.PENDING,
      PAYMENT_STATUS.PENDING,
      note || '', contactName, contactPhone, address || '', paymentMethod || 'whatsapp',
    ],
  );
}

async function updateOrderCouponUcId(q, orderId, ucId) {
  await q.query('UPDATE orders SET coupon_uc_id = ? WHERE id = ?', [ucId, orderId]);
}

async function insertOrderItem(q, params) {
  const { id, orderId, productId, productName, productImage, price, points, qty } = params;
  await q.query(
    `INSERT INTO order_items (id, order_id, product_id, product_name, product_image, price, points, qty)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, orderId, productId, productName, productImage, price, points, qty],
  );
}

/** @returns {Promise<number>} affectedRows */
async function deductProductStock(q, productId, qty) {
  const [result] = await q.query(
    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
    [qty, productId, qty],
  );
  return result.affectedRows;
}

async function incrementUserPoints(q, userId, points) {
  await q.query('UPDATE users SET points_balance = points_balance + ? WHERE id = ?', [points, userId]);
}

async function insertPointsRecord(q, params) {
  const { id, userId, action, amount, description } = params;
  await q.query(
    `INSERT INTO points_records (id, user_id, action, amount, description) VALUES (?,?,?,?,?)`,
    [id, userId, action, amount, description],
  );
}

async function deleteCartItemsForProducts(q, userId, productIds) {
  if (!productIds.length) return;
  await q.query(
    `DELETE FROM cart_items WHERE user_id = ? AND product_id IN (${productIds.map(() => '?').join(',')})`,
    [userId, ...productIds],
  );
}

async function selectOrderById(q, orderId) {
  const [[row]] = await q.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return row || null;
}

async function countOrdersForUser(q, userId, status) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [[{ total }]] = await q.query(`SELECT COUNT(*) as total FROM orders ${where}`, params);
  return total;
}

async function selectOrdersPage(q, userId, status, pageSize, offset) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await q.query(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectOrderItemsByOrderIds(q, orderIds) {
  if (!orderIds.length) return [];
  const [rows] = await q.query(
    `SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
    orderIds,
  );
  return rows;
}

async function selectOrderByIdAndUser(q, orderId, userId) {
  const [[row]] = await q.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
  return row || null;
}

async function selectOrderByIdAndUserForUpdate(q, orderId, userId) {
  const [[row]] = await q.query(
    'SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
    [orderId, userId],
  );
  return row || null;
}

async function selectOrderItems(q, orderId) {
  const [rows] = await q.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return rows;
}

async function updateOrderStatus(q, orderId, status) {
  await q.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
}

async function selectOrderItemQtyRows(q, orderId) {
  const [rows] = await q.query('SELECT product_id, qty FROM order_items WHERE order_id = ?', [orderId]);
  return rows;
}

async function restoreProductStock(q, productId, qty) {
  await q.query('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, productId]);
}

async function incrementProductSales(q, productId, qty) {
  await q.query(
    'UPDATE products SET sales_count = sales_count + ? WHERE id = ?',
    [qty, productId],
  );
}

async function decrementUserPoints(q, userId, points) {
  await q.query('UPDATE users SET points_balance = GREATEST(0, points_balance - ?) WHERE id = ?', [points, userId]);
}

async function restoreUserCouponById(q, ucId) {
  await q.query("UPDATE user_coupons SET status = 'available', used_at = NULL WHERE id = ?", [ucId]);
}

async function restoreUserCouponHeuristic(q, userId, createdAt) {
  await q.query(
    `UPDATE user_coupons SET status = 'available', used_at = NULL
     WHERE user_id = ? AND status = 'used'
     AND used_at >= ? AND used_at <= DATE_ADD(?, INTERVAL 1 MINUTE) LIMIT 1`,
    [userId, createdAt, createdAt],
  );
}

async function updateOrderPaid(q, orderId, params = {}) {
  const { paymentTime, paymentChannel, paymentTransactionNo, paymentMethod } = params;
  await q.query(
    `UPDATE orders
       SET status = ?, payment_status = ?, payment_time = ?, payment_channel = ?, payment_transaction_no = ?, payment_method = ?
     WHERE id = ?`,
    [
      ORDER_STATUS.PAID,
      PAYMENT_STATUS.PAID,
      paymentTime || new Date(),
      paymentChannel || 'stripe',
      paymentTransactionNo || '',
      paymentMethod || 'online',
      orderId,
    ],
  );
}

async function insertWebhookEventIfAbsent(q, params) {
  const { eventId, eventType, orderId } = params;
  const [result] = await q.query(
    `INSERT IGNORE INTO payment_webhook_events (event_id, event_type, order_id, status)
     VALUES (?, ?, ?, 'processed')`,
    [eventId, eventType, orderId || null],
  );
  return result.affectedRows > 0;
}

async function insertNotification(q, params) {
  const { id, userId, type, title, content } = params;
  await q.query(
    `INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)`,
    [id, userId, type, title, content],
  );
}

async function selectUserInviteCode(q, userId) {
  const [[row]] = await q.query('SELECT parent_invite_code FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function selectUserIdByInviteCode(q, code) {
  const [[row]] = await q.query('SELECT id FROM users WHERE invite_code = ?', [code]);
  return row || null;
}

async function selectReferralRulesEnabled(q) {
  const [rows] = await q.query('SELECT * FROM referral_rules WHERE enabled = 1 ORDER BY level ASC');
  return rows;
}

async function insertRewardRecord(q, params) {
  const { id, userId, orderId, orderNo, amount, rate, status } = params;
  await q.query(
    `INSERT INTO reward_records (id, user_id, order_id, order_no, amount, rate, status)
     VALUES (?,?,?,?,?,?,?)`,
    [id, userId, orderId, orderNo, amount, rate, status],
  );
}

module.exports = {
  selectProductsForUpdate,
  selectShippingTemplate,
  selectUserCouponForUpdate,
  selectCouponCategoryIds,
  updateUserCouponUsed,
  insertOrder,
  updateOrderCouponUcId,
  insertOrderItem,
  deductProductStock,
  incrementUserPoints,
  insertPointsRecord,
  deleteCartItemsForProducts,
  selectOrderById,
  countOrdersForUser,
  selectOrdersPage,
  selectOrderItemsByOrderIds,
  selectOrderByIdAndUser,
  selectOrderByIdAndUserForUpdate,
  selectOrderItems,
  updateOrderStatus,
  selectOrderItemQtyRows,
  restoreProductStock,
  incrementProductSales,
  decrementUserPoints,
  restoreUserCouponById,
  restoreUserCouponHeuristic,
  updateOrderPaid,
  insertWebhookEventIfAbsent,
  insertNotification,
  selectUserInviteCode,
  selectUserIdByInviteCode,
  selectReferralRulesEnabled,
  insertRewardRecord,
};
