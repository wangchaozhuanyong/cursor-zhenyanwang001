const db = require('../../config/db');
const { ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS } = require('../../constants/status');

async function countReturnRequests(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM return_requests r ${where || ''}`, params || []);
  return total;
}

async function selectReturnRequestsPage(where, params, pageSize, offset, sortBy, sortOrder) {
  const col = ['created_at', 'status', 'refund_amount'].includes(sortBy) ? sortBy : 'created_at';
  const dir = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  const [rows] = await db.query(
    `SELECT r.* FROM return_requests r ${where || ''} ORDER BY r.${col} ${dir} LIMIT ? OFFSET ?`,
    [...(params || []), pageSize, offset],
  );
  return rows;
}

async function updateReturnRequestByFields(setFragments, values, id) {
  await db.query(
    `UPDATE return_requests SET ${setFragments.join(', ')} WHERE id = ?`,
    [...values, id],
  );
}

async function selectAllBanners() {
  const [rows] = await db.query('SELECT * FROM banners WHERE deleted_at IS NULL ORDER BY sort_order ASC');
  return rows;
}

async function insertBanner(params) {
  const { id, title, image, link, sort_order, enabled, publish_status, last_modified_by } = params;
  await db.query(
    'INSERT INTO banners (id, title, image, link, sort_order, enabled, publish_status, last_modified_by, last_modified_at) VALUES (?,?,?,?,?,?,?,?,NOW())',
    [id, title || '', image, link || '', sort_order || 0, enabled, publish_status || 'published', last_modified_by || null],
  );
}

async function selectBannerById(id) {
  const [[row]] = await db.query('SELECT * FROM banners WHERE id = ?', [id]);
  return row || null;
}

async function updateBannerByFields(setFragments, values, id) {
  await db.query(`UPDATE banners SET ${setFragments.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteBanner(id, deletedBy) {
  await db.query('UPDATE banners SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy || null, id]);
}

async function restoreBanner(id) {
  await db.query('UPDATE banners SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
}

async function selectProductTags() {
  const [rows] = await db.query('SELECT id, name FROM product_tags ORDER BY created_at DESC');
  return rows;
}

async function insertProductTag(id, name) {
  await db.query('INSERT INTO product_tags (id, name) VALUES (?, ?)', [id, name]);
}

async function deleteProductTag(id) {
  await db.query('DELETE FROM product_tags WHERE id = ?', [id]);
}

async function selectReturnById(id) {
  const [[row]] = await db.query('SELECT * FROM return_requests WHERE id = ?', [id]);
  return row || null;
}

async function selectShippingTemplatesRaw() {
  const [rows] = await db.query('SELECT * FROM shipping_templates ORDER BY id ASC');
  return rows;
}

async function insertShippingTemplate(params) {
  const [result] = await db.query(
    `INSERT INTO shipping_templates (name, regions, base_fee, free_above, extra_per_kg, enabled) VALUES (?,?,?,?,?,?)`,
    params,
  );
  return result.insertId;
}

async function updateShippingTemplateByFields(setFragments, values, id) {
  await db.query(
    `UPDATE shipping_templates SET ${setFragments.join(', ')} WHERE id = ?`,
    [...values, id],
  );
}

async function deleteShippingTemplate(id) {
  await db.query('DELETE FROM shipping_templates WHERE id = ?', [id]);
}

async function selectPointsRules() {
  const [rows] = await db.query('SELECT * FROM points_rules ORDER BY id ASC');
  return rows;
}

async function updatePointsRuleByFields(setFragments, values, id) {
  await db.query(`UPDATE points_rules SET ${setFragments.join(', ')} WHERE id = ?`, [...values, id]);
}

async function selectReferralRules() {
  const [rows] = await db.query('SELECT * FROM referral_rules ORDER BY level ASC');
  return rows;
}

async function updateReferralRuleByFields(setFragments, values, id) {
  await db.query(`UPDATE referral_rules SET ${setFragments.join(', ')} WHERE id = ?`, [...values, id]);
}

async function selectContentPages() {
  const [rows] = await db.query('SELECT * FROM content_pages WHERE deleted_at IS NULL ORDER BY id ASC');
  return rows;
}

/** 内容页更新前审计快照（仅 id / title / slug / content 长度） */
async function selectContentPageAuditSnapshotById(id) {
  const [[row]] = await db.query(
    'SELECT id, title, slug, CHAR_LENGTH(IFNULL(content,"")) AS content_len FROM content_pages WHERE id = ?',
    [id],
  );
  return row || null;
}

async function updateContentPageByFields(setFragments, values, id) {
  await db.query(`UPDATE content_pages SET ${setFragments.join(', ')} WHERE id = ?`, [...values, id]);
}

function q(conn) {
  return conn || db;
}

async function selectReturnByIdConn(conn, id) {
  const [[ret]] = await q(conn).query('SELECT * FROM return_requests WHERE id = ?', [id]);
  return ret || null;
}

async function updateReturnRejected(id, adminRemark) {
  await db.query(
    'UPDATE return_requests SET status = ?, admin_remark = ? WHERE id = ?',
    [RETURN_STATUS.REJECTED, adminRemark || '', id],
  );
}

async function updateReturnApprovedConn(conn, refundAmount, adminRemark, id) {
  await q(conn).query(
    'UPDATE return_requests SET status = ?, refund_amount = ?, admin_remark = ? WHERE id = ?',
    [RETURN_STATUS.APPROVED, refundAmount || 0, adminRemark || '', id],
  );
}

async function selectOrderByIdConn(conn, orderId) {
  const [[order]] = await q(conn).query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return order || null;
}

async function updateOrderStatusConn(conn, status, orderId) {
  if (status === ORDER_STATUS.REFUNDED) {
    await q(conn).query(
      'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
      [status, PAYMENT_STATUS.REFUNDED, orderId],
    );
  } else {
    await q(conn).query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
  }
}

async function selectOrderItemsConn(conn, orderId) {
  const [orderItems] = await q(conn).query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ?',
    [orderId],
  );
  return orderItems;
}

async function addProductStockConn(conn, productId, qty) {
  await q(conn).query('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, productId]);
}

async function deductUserPointsConn(conn, userId, points) {
  await q(conn).query(
    'UPDATE users SET points_balance = GREATEST(0, points_balance - ?) WHERE id = ?',
    [points, userId],
  );
}

async function insertPointsRecordConn(conn, id, userId, action, amount, description) {
  await q(conn).query(
    `INSERT INTO points_records (id, user_id, action, amount, description) VALUES (?,?,?,?,?)`,
    [id, userId, action, amount, description],
  );
}

async function restoreUserCouponConn(conn, ucId) {
  await q(conn).query(`UPDATE user_coupons SET status = 'available', used_at = NULL WHERE id = ?`, [ucId]);
}

async function insertNotificationConn(conn, id, userId, type, title, content) {
  await q(conn).query(
    `INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)`,
    [id, userId, type, title, content],
  );
}

module.exports = {
  countReturnRequests,
  selectReturnRequestsPage,
  updateReturnRequestByFields,
  updateReturnRejected,
  selectAllBanners,
  insertBanner,
  selectBannerById,
  updateBannerByFields,
  deleteBanner,
  restoreBanner,
  selectProductTags,
  insertProductTag,
  deleteProductTag,
  selectReturnById,
  selectShippingTemplatesRaw,
  insertShippingTemplate,
  updateShippingTemplateByFields,
  deleteShippingTemplate,
  selectPointsRules,
  updatePointsRuleByFields,
  selectReferralRules,
  updateReferralRuleByFields,
  selectContentPages,
  selectContentPageAuditSnapshotById,
  updateContentPageByFields,
  selectReturnByIdConn,
  updateReturnApprovedConn,
  selectOrderByIdConn,
  updateOrderStatusConn,
  selectOrderItemsConn,
  addProductStockConn,
  deductUserPointsConn,
  insertPointsRecordConn,
  restoreUserCouponConn,
  insertNotificationConn,
};
