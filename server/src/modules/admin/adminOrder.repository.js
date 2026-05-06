/**
 * Admin Order Repository
 *
 * 仅做数据库访问。函数命名以「动作 + 表」为主：
 *   selectXxx / updateXxx / insertXxx / countXxx
 *
 * 凡涉及多语句事务的方法，第一参数都接收 `q`（pool 或 connection）以便服务层
 * 在同一个事务内串联多次写入。Service 不应再出现 db.query / conn.query。
 */
const db = require('../../config/db');
const { ORDER_STATUS } = require('../../constants/status');

/**
 * @typedef {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} Queryable
 */

/**
 * @param {Queryable} q
 * @param {string} orderId
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

/**
 * @param {Queryable|null} q
 * @param {string} orderId
 */
async function selectOrderById(q, orderId) {
  const pool = q || db;
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return order || null;
}

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

/* ────────────────────────────────────────────────────────────────────
 * 事务内方法（接收 conn）
 * ──────────────────────────────────────────────────────────────────── */

/**
 * @param {Queryable} q
 * @param {string} orderId
 * @param {string} status
 * @param {string} paymentStatus
 */
async function updateOrderStatusAndPayment(q, orderId, status, paymentStatus) {
  await q.query(
    'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
    [status, paymentStatus, orderId],
  );
}

/**
 * @param {Queryable} q
 * @param {string} orderId
 * @param {string} remark
 */
async function appendAdminRemark(q, orderId, remark) {
  await q.query(
    'UPDATE orders SET note = CONCAT(IFNULL(note, ""), ?) WHERE id = ?',
    [`\n[管理备注] ${remark}`, orderId],
  );
}

async function selectFullOrder(q, orderId) {
  const [[row]] = await q.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return row || null;
}

async function selectOrderItemPairs(q, orderId) {
  const [rows] = await q.query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ?',
    [orderId],
  );
  return rows || [];
}

async function bumpProductSalesCount(q, productId, qty) {
  await q.query(
    'UPDATE products SET sales_count = sales_count + ? WHERE id = ?',
    [qty, productId],
  );
}

async function restoreProductStock(q, productId, qty) {
  await q.query('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, productId]);
}

async function decrementUserPoints(q, userId, points) {
  await q.query(
    'UPDATE users SET points_balance = GREATEST(0, points_balance - ?) WHERE id = ?',
    [points, userId],
  );
}

async function restoreUserCouponById(q, userCouponId) {
  await q.query(
    "UPDATE user_coupons SET status = 'available', used_at = NULL WHERE id = ?",
    [userCouponId],
  );
}

async function selectUserParentInviteCode(q, userId) {
  const [[row]] = await q.query('SELECT parent_invite_code FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function selectUserIdByInviteCode(q, inviteCode) {
  const [[row]] = await q.query('SELECT id FROM users WHERE invite_code = ?', [inviteCode]);
  return row || null;
}

async function selectReferralRulesEnabled(q) {
  const [rows] = await q.query('SELECT * FROM referral_rules WHERE enabled = 1 ORDER BY level ASC');
  return rows || [];
}

async function insertRewardRecord(q, params) {
  const { id, userId, orderId, orderNo, amount, rate, status } = params;
  await q.query(
    `INSERT INTO reward_records (id, user_id, order_id, order_no, amount, rate, status)
     VALUES (?,?,?,?,?,?,?)`,
    [id, userId, orderId, orderNo, amount, rate, status],
  );
}

async function incrementUserPoints(q, userId, points) {
  await q.query(
    'UPDATE users SET points_balance = points_balance + ? WHERE id = ?',
    [points, userId],
  );
}

async function insertPointsRecord(q, params) {
  const { id, userId, action, amount, description } = params;
  await q.query(
    `INSERT INTO points_records (id, user_id, action, amount, description) VALUES (?,?,?,?,?)`,
    [id, userId, action, amount, description],
  );
}

async function insertOrderNotification(q, params) {
  const { id, userId, title, content } = params;
  await q.query(
    `INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)`,
    [id, userId, 'order', title, content],
  );
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

  updateOrderStatusAndPayment,
  appendAdminRemark,
  selectFullOrder,
  selectOrderItemPairs,
  bumpProductSalesCount,
  restoreProductStock,
  decrementUserPoints,
  restoreUserCouponById,
  selectUserParentInviteCode,
  selectUserIdByInviteCode,
  selectReferralRulesEnabled,
  insertRewardRecord,
  incrementUserPoints,
  insertPointsRecord,
  insertOrderNotification,
};
