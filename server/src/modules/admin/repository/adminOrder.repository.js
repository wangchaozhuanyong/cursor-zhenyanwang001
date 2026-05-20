/**
 * Admin Order Repository
 *
 * 浠呭仛鏁版嵁搴撹闂€傚嚱鏁板懡鍚嶄互銆屽姩浣?+ 琛ㄣ€嶄负涓伙細
 *   selectXxx / updateXxx / insertXxx / countXxx
 *
 * 鍑℃秹鍙婂璇彞浜嬪姟鐨勬柟娉曪紝绗竴鍙傛暟閮芥帴鏀?`q`锛坧ool 鎴?connection锛変互渚挎湇鍔″眰
 * 鍦ㄥ悓涓€涓簨鍔″唴涓茶仈澶氭鍐欏叆銆係ervice 涓嶅簲鍐嶅嚭鐜?db.query / conn.query銆? */
const db = require('../../../config/db');
const { ORDER_STATUS } = require('../../../constants/status');
const { generateId } = require('../../../utils/helpers');
const { getOrderRevenueExprs } = require('../../../db/schemaContract');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

/**
 * @typedef {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} Queryable
 */

/**
 * @param {Queryable} q
 * @param {string} orderId
 */
async function selectOrderItemsWithProduct(q, orderId) {
  const [items] = await q.query(
    `SELECT
       oi.*,
       COALESCE(NULLIF(oi.product_name, ''), p.name) AS name,
       COALESCE(NULLIF(oi.product_image, ''), p.cover_image) AS cover_image,
       oi.price AS unit_price
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderId],
  );
  return items;
}

async function countOrdersAdmin(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${where}`,
    params,
  );
  return total;
}

async function selectOrderStatusSummary(where, params) {
  const [rows] = await db.query(
    `SELECT o.status, COUNT(*) AS count
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${where}
     GROUP BY o.status`,
    params,
  );
  return rows;
}

async function selectOrdersAdminPage(where, params, pageSize, offset) {
  const [orders] = await db.query(
    `SELECT
       o.id, o.user_id, o.order_no, o.raw_amount, o.discount_amount, o.coupon_title,
       o.shipping_fee, o.shipping_name, o.tracking_no, o.carrier, o.total_amount,
       o.goods_cost_amount, o.gross_profit_amount, o.shipping_cost_amount, o.payment_fee_amount, o.net_profit_amount,
       o.total_points, o.status, o.payment_status, o.refund_status, o.refunded_amount,
       o.note, o.contact_name, o.contact_phone, o.shipping_phone, o.address,
       o.payment_method, o.payment_channel, o.payment_transaction_no, o.payment_time,
       o.paid_at, o.shipped_at, o.cancelled_at, o.completed_at, o.created_at,
       o.points_discount_amount, o.reward_cash_discount_amount, o.reward_cash_used,
       u.nickname AS user_nickname,
       u.phone AS user_phone,
       u.email AS user_email,
       u.member_level_id,
       ml.name AS member_level_name,
       COALESCE(user_stats.order_count, 0) AS user_order_count,
       COALESCE(user_stats.total_paid_amount, 0) AS user_total_paid_amount,
       COALESCE(item_stats.items_count, 0) AS items_count,
       COALESCE(item_stats.sku_count, 0) AS sku_count,
       item_stats.items_summary,
       COALESCE(item_stats.missing_cost_item_count, 0) AS missing_cost_item_count,
       item_stats.cost_snapshot_source,
       COALESCE(return_stats.return_request_count, 0) AS return_request_count,
       COALESCE(return_stats.active_return_count, 0) AS active_return_count,
       COALESCE(o.refunded_amount, 0) AS refund_amount
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     LEFT JOIN (
       SELECT
         user_id,
         COUNT(*) AS order_count,
         SUM(CASE WHEN payment_status IN ('paid', 'partially_refunded') THEN total_amount ELSE 0 END) AS total_paid_amount
       FROM orders
       GROUP BY user_id
     ) user_stats ON user_stats.user_id = o.user_id
     LEFT JOIN (
       SELECT
         order_id,
         SUM(qty) AS items_count,
         COUNT(DISTINCT COALESCE(NULLIF(variant_id, ''), product_id)) AS sku_count,
         GROUP_CONCAT(
           CONCAT(COALESCE(NULLIF(product_name, ''), NULLIF(product_name_snapshot, ''), '商品'), ' ×', qty)
           ORDER BY id
           SEPARATOR '；'
         ) AS items_summary,
         SUM(CASE WHEN cost_snapshot_source = 'missing' THEN 1 ELSE 0 END) AS missing_cost_item_count,
         CASE WHEN SUM(CASE WHEN cost_snapshot_source = 'missing' THEN 1 ELSE 0 END) > 0 THEN 'missing' ELSE 'normal' END AS cost_snapshot_source
       FROM order_items
       GROUP BY order_id
     ) item_stats ON item_stats.order_id = o.id
     LEFT JOIN (
       SELECT
         order_id,
         COUNT(*) AS return_request_count,
         SUM(CASE WHEN status IN ('pending', 'approved', 'processing') THEN 1 ELSE 0 END) AS active_return_count
       FROM return_requests
       GROUP BY order_id
     ) return_stats ON return_stats.order_id = o.id
     ${where}
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return orders;
}

async function selectOrdersForExport(where, params) {
  const [orders] = await db.query(
    `SELECT
       o.*,
       u.nickname AS user_nickname,
       u.phone AS user_phone,
       u.email AS user_email,
       COALESCE(item_stats.items_count, 0) AS items_count,
       COALESCE(item_stats.sku_count, 0) AS sku_count,
       item_stats.items_summary,
       COALESCE(item_stats.missing_cost_item_count, 0) AS missing_cost_item_count,
       COALESCE(return_stats.return_request_count, 0) AS return_request_count,
       COALESCE(return_stats.active_return_count, 0) AS active_return_count,
       COALESCE(o.refunded_amount, 0) AS refund_amount
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN (
       SELECT
         order_id,
         SUM(qty) AS items_count,
         COUNT(DISTINCT COALESCE(NULLIF(variant_id, ''), product_id)) AS sku_count,
         GROUP_CONCAT(
           CONCAT(COALESCE(NULLIF(product_name, ''), NULLIF(product_name_snapshot, ''), '商品'), ' ×', qty)
           ORDER BY id
           SEPARATOR '；'
         ) AS items_summary,
         SUM(CASE WHEN cost_snapshot_source = 'missing' THEN 1 ELSE 0 END) AS missing_cost_item_count
       FROM order_items
       GROUP BY order_id
     ) item_stats ON item_stats.order_id = o.id
     LEFT JOIN (
       SELECT
         order_id,
         COUNT(*) AS return_request_count,
         SUM(CASE WHEN status IN ('pending', 'approved', 'processing') THEN 1 ELSE 0 END) AS active_return_count
       FROM return_requests
       GROUP BY order_id
     ) return_stats ON return_stats.order_id = o.id
     ${where}
     ORDER BY o.created_at DESC`,
    params,
  );
  return orders;
}

async function selectOrderOperationalSummary(where, params) {
  const { schema } = await getOrderRevenueExprs();
  const paidNet = schema.ordersRefundedAmount
    ? 'GREATEST(0, o.total_amount - COALESCE(o.refunded_amount, 0))'
    : 'o.total_amount';
  const refundCol = schema.ordersRefundedAmount ? 'COALESCE(o.refunded_amount, 0)' : '0';
  const grossCol = schema.ordersGrossProfit ? 'COALESCE(o.gross_profit_amount, 0)' : '0';
  const netCol = schema.ordersNetProfit ? 'COALESCE(o.net_profit_amount, 0)' : '0';
  const [[row]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS today_order_count,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN 1 ELSE 0 END), 0) AS today_paid_order_count,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded')
         THEN ${paidNet} ELSE 0 END), 0) AS today_paid_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         THEN ${refundCol} ELSE 0 END), 0) AS today_refund_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN ${grossCol} ELSE 0 END), 0) AS today_gross_profit_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN ${netCol} ELSE 0 END), 0) AS today_net_profit_amount,
       COALESCE(SUM(CASE WHEN COALESCE(o.payment_status, 'pending') = 'pending' THEN o.total_amount ELSE 0 END), 0) AS pending_payment_amount,
       COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_status IN ('paid', 'partially_refunded') THEN 1 ELSE 0 END), 0) AS pending_shipment_count,
       COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_status IN ('paid', 'partially_refunded') THEN o.total_amount ELSE 0 END), 0) AS pending_shipment_amount,
       COALESCE(SUM(CASE WHEN return_stats.active_return_count > 0 THEN return_stats.active_return_count ELSE 0 END), 0) AS active_return_count,
       COALESCE(SUM(CASE WHEN COALESCE(o.payment_status, 'pending') = 'pending'
         AND o.created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR) THEN 1 ELSE 0 END), 0) AS overdue_unpaid_count,
       COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_status IN ('paid', 'partially_refunded')
         AND COALESCE(o.paid_at, o.payment_time, o.created_at) < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END), 0) AS overdue_shipment_count
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN (
       SELECT
         order_id,
         SUM(CASE WHEN status IN ('pending', 'approved', 'processing') THEN 1 ELSE 0 END) AS active_return_count
       FROM return_requests
       GROUP BY order_id
     ) return_stats ON return_stats.order_id = o.id
     ${where}`,
    params,
  );
  return row || {};
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
    `UPDATE orders
       SET status = ?, tracking_no = ?, carrier = ?,
           shipped_at = COALESCE(shipped_at, NOW())
     WHERE id = ?`,
    [ORDER_STATUS.SHIPPED, trackingNo, carrier, orderId],
  );
}

/**
 * 杩涘叆銆屽凡鍙戣揣銆嶆椂璁板綍棣栨鍙戣揣鏃堕棿锛堣嫢宸叉湁鍒欎繚鐣欙紝渚夸簬澶氭鏇存柊杩愬崟鍙蜂笉鏀瑰彉璁℃椂璧风偣锛? * @param {import('mysql2/promise').PoolConnection} q
 * @param {string} orderId
 */
async function touchOrderShippedAtIfNull(q, orderId) {
  await q.query(
    'UPDATE orders SET shipped_at = COALESCE(shipped_at, NOW()) WHERE id = ?',
    [orderId],
  );
}

async function selectOrderItemsBatch(orderIds) {
  if (!orderIds.length) return [];
  const placeholders = orderIds.map(() => '?').join(',');
  const [items] = await db.query(
    `SELECT
       oi.*,
       COALESCE(NULLIF(oi.product_name, ''), p.name) AS name,
       COALESCE(NULLIF(oi.product_image, ''), p.cover_image) AS cover_image,
       oi.price AS unit_price
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id IN (${placeholders})`,
    orderIds,
  );
  return items;
}

/* 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
 * 浜嬪姟鍐呮柟娉曪紙鎺ユ敹 conn锛? * 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

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

async function updateOrderStatusPaymentAndPaidTime(q, orderId, status, paymentStatus) {
  await q.query(
    `UPDATE orders
     SET status = ?, payment_status = ?,
         payment_time = COALESCE(payment_time, NOW()),
         paid_at = COALESCE(paid_at, NOW())
     WHERE id = ?`,
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
    [`\n[绠＄悊澶囨敞] ${remark}`, orderId],
  );
}

async function selectFullOrder(q, orderId) {
  const [[row]] = await q.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return row || null;
}

async function selectOrderItemPairs(q, orderId) {
  const [rows] = await q.query(
    'SELECT product_id, variant_id, qty FROM order_items WHERE order_id = ?',
    [orderId],
  );
  return rows || [];
}

async function restoreVariantStock(q, variantId, qty, meta = {}) {
  const [[beforeRow]] = await q.query(
    `SELECT v.stock, v.product_id, v.title, v.sku_code, p.name AS product_name
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id = ?
     FOR UPDATE`,
    [variantId],
  );
  if (!beforeRow) return 0;
  const beforeStock = Number(beforeRow.stock || 0);
  const afterStock = beforeStock + Number(qty || 0);
  await q.query('UPDATE product_variants SET stock = ? WHERE id = ?', [afterStock, variantId]);
  await q.query(
    `UPDATE products p
     SET p.stock = COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id), p.stock)
     WHERE p.id = ?`,
    [beforeRow.product_id],
  );
  await q.query(
    `INSERT INTO inventory_stock_records
       (id, product_id, variant_id, change_type, quantity_delta, before_stock,
        after_stock, reason, ref_type, ref_id, operator_id,
        product_name_snapshot, variant_name_snapshot, sku_code_snapshot, order_no_snapshot, source_no, remark, created_by_type)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      generateId(),
      beforeRow.product_id,
      variantId,
      'order_release',
      qty,
      beforeStock,
      afterStock,
      meta.reason || '管理员取消订单释放 SKU 库存',
      meta.refType || 'order',
      meta.refId || '',
      meta.operatorId || null,
      beforeRow.product_name || '',
      beforeRow.title || '',
      beforeRow.sku_code || '',
      meta.orderNo || '',
      '',
      '',
      'admin',
    ],
  );
  return 1;
}

async function bumpProductSalesCount(q, productId, qty) {
  await q.query(
    'UPDATE products SET sales_count = sales_count + ? WHERE id = ?',
    [qty, productId],
  );
}
async function ensurePointsAccount(q, userId) {
  await q.query(
    `INSERT IGNORE INTO points_accounts (user_id, balance, total_earned)
     SELECT id, COALESCE(points_balance, 0), GREATEST(COALESCE(points_balance, 0), 0)
     FROM users WHERE id = ?`,
    [userId],
  );
}

async function syncUserPointsFromAccount(q, userId) {
  await q.query(
    `UPDATE users u
     JOIN points_accounts pa ON pa.user_id = u.id
     SET u.points_balance = pa.balance
     WHERE u.id = ?`,
    [userId],
  );
}

async function decrementUserPoints(q, userId, points) {
  const amount = Math.max(Number(points) || 0, 0);
  await ensurePointsAccount(q, userId);
  await q.query(
    `UPDATE points_accounts
     SET balance = GREATEST(0, balance - ?),
         total_spent = total_spent + ?,
         total_reversed = total_reversed + ?
     WHERE user_id = ?`,
    [amount, amount, amount, userId],
  );
  await syncUserPointsFromAccount(q, userId);
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
  const amount = Math.max(Number(points) || 0, 0);
  await ensurePointsAccount(q, userId);
  await q.query(
    `UPDATE points_accounts
     SET balance = balance + ?, total_earned = total_earned + ?
     WHERE user_id = ?`,
    [amount, amount, userId],
  );
  await syncUserPointsFromAccount(q, userId);
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
  getPool,
  getConnection,
  selectOrderItemsWithProduct,
  selectOrderItemsBatch,
  countOrdersAdmin,
  selectOrderStatusSummary,
  selectOrderOperationalSummary,
  selectOrdersAdminPage,
  selectOrdersForExport,
  selectOrderById,
  selectOrderStateById,
  updateOrderShipped,
  touchOrderShippedAtIfNull,

  updateOrderStatusAndPayment,
  updateOrderStatusPaymentAndPaidTime,
  appendAdminRemark,
  selectFullOrder,
  selectOrderItemPairs,
  bumpProductSalesCount,
  restoreVariantStock,
  decrementUserPoints,
  restoreUserCouponById,
  selectUserParentInviteCode,
  selectUserIdByInviteCode,
  selectReferralRulesEnabled,
  insertRewardRecord,
  incrementUserPoints,
  insertPointsRecord,
  insertOrderNotification,
  countPendingShipmentOrders,
  selectPendingShipmentOrdersPage,
  selectOrdersByIds,
};


async function countPendingShipmentOrders() {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM orders WHERE status = ? AND (payment_status = ? OR payment_status = ?)',
    [ORDER_STATUS.PAID, 'paid', 'partially_refunded'],
  );
  return total;
}

async function selectPendingShipmentOrdersPage(pageSize, offset) {
  const [rows] = await db.query(
    'SELECT * FROM orders WHERE status = ? AND (payment_status = ? OR payment_status = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [ORDER_STATUS.PAID, 'paid', 'partially_refunded', pageSize, offset],
  );
  return rows;
}

async function selectOrdersByIds(orderIds = []) {
  if (!orderIds.length) return [];
  const placeholders = orderIds.map(() => '?').join(',');
  const [rows] = await db.query(
    'SELECT * FROM orders WHERE id IN (' + placeholders + ')',
    orderIds,
  );
  return rows;
}
