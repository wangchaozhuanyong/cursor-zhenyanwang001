const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}
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
  const sqlWithColor = `
    SELECT pt.id, pt.name, pt.sort_order, pt.color, pt.bg_color, pt.text_color, pt.enabled,
      (
        SELECT COUNT(*)
        FROM product_tag_assignments x
        INNER JOIN products pr ON pr.id = x.product_id AND pr.deleted_at IS NULL
        WHERE x.tag_id = pt.id
      ) AS usage_count
    FROM product_tags pt
    WHERE pt.deleted_at IS NULL
    ORDER BY pt.sort_order DESC, pt.created_at DESC
  `;
  const sqlLegacy = `
    SELECT pt.id, pt.name, pt.sort_order, '金色' AS color,
      '#FEF3C7' AS bg_color, '#92400E' AS text_color, 1 AS enabled,
      (
        SELECT COUNT(*)
        FROM product_tag_assignments x
        INNER JOIN products pr ON pr.id = x.product_id AND pr.deleted_at IS NULL
        WHERE x.tag_id = pt.id
      ) AS usage_count
    FROM product_tags pt
    ORDER BY pt.sort_order DESC, pt.created_at DESC
  `;
  try {
    const [rows] = await db.query(sqlWithColor);
    return rows;
  } catch (e) {
    const msg = String(e && e.sqlMessage ? e.sqlMessage : e.message || e);
    if (e && (e.code === 'ER_BAD_FIELD_ERROR' || /Unknown column.*color/i.test(msg))) {
      const [rows] = await db.query(sqlLegacy);
      return rows;
    }
    throw e;
  }
}

async function insertProductTag(id, name, color, bgColor, textColor, sortOrder = 0, enabled = 1) {
  const c = color && String(color).trim() ? String(color).trim().slice(0, 20) : '金色';
  const bg = bgColor && String(bgColor).trim() ? String(bgColor).trim().slice(0, 20) : '#FEF3C7';
  const text = textColor && String(textColor).trim() ? String(textColor).trim().slice(0, 20) : '#92400E';
  try {
    await db.query(
      'INSERT INTO product_tags (id, name, color, bg_color, text_color, sort_order, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, c, bg, text, Number(sortOrder) || 0, enabled ? 1 : 0],
    );
  } catch (e) {
    const msg = String(e && e.sqlMessage ? e.sqlMessage : e.message || e);
    if (e && (e.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/i.test(msg))) {
      await db.query('INSERT INTO product_tags (id, name, sort_order) VALUES (?, ?, ?)', [id, name, Number(sortOrder) || 0]);
      return;
    }
    throw e;
  }
}

async function selectProductTagById(id) {
  try {
    const [[row]] = await db.query(
      `SELECT id, name, sort_order, color, bg_color, text_color, enabled
       FROM product_tags
       WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row || null;
  } catch (e) {
    if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    const [[row]] = await db.query(
      `SELECT id, name, sort_order, color,
        '#FEF3C7' AS bg_color, '#92400E' AS text_color, 1 AS enabled
       FROM product_tags
       WHERE id = ?`,
      [id],
    );
    return row || null;
  }
}

async function updateProductTag(id, fields, values) {
  await db.query(`UPDATE product_tags SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteProductTag(id) {
  try {
    await db.query('UPDATE product_tags SET deleted_at = NOW(), enabled = 0 WHERE id = ?', [id]);
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      await db.query('DELETE FROM product_tags WHERE id = ?', [id]);
      return;
    }
    throw e;
  }
}

async function selectReturnById(id) {
  const [[row]] = await db.query('SELECT * FROM return_requests WHERE id = ?', [id]);
  return row || null;
}

async function selectReturnDetailById(id) {
  const [[row]] = await db.query(
    `SELECT
       r.*,
       o.order_no AS order_no_snapshot,
       o.total_amount AS order_total_amount,
       o.payment_status AS order_payment_status,
       o.status AS order_status,
       o.refund_status AS order_refund_status,
       o.created_at AS order_created_at,
       u.username AS user_name,
       u.email AS user_email,
       u.phone AS user_phone,
       oi.product_name AS order_item_product_name,
       oi.product_image AS order_item_product_image,
       oi.price AS order_item_price,
       oi.qty AS order_item_qty,
       oi.variant_name AS order_item_variant_name,
       oi.sku_code AS order_item_sku_code,
       p.name AS product_name,
       pv.title AS variant_title,
       pv.sku_code AS variant_sku_code
     FROM return_requests r
     LEFT JOIN orders o ON o.id = r.order_id
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN order_items oi ON oi.id = r.order_item_id
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN product_variants pv ON pv.id = r.variant_id
     WHERE r.id = ?`,
    [id],
  );
  return row || null;
}

async function selectShippingTemplatesRaw() {
  const [rows] = await db.query('SELECT * FROM shipping_templates ORDER BY id ASC');
  return rows;
}

async function insertShippingTemplate(params) {
  const [name, regions, baseFee, freeAbove, extraPerKg, enabled] = params;
  const [[col]] = await db.query(
    `
      SELECT DATA_TYPE AS dataType
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'shipping_templates'
        AND COLUMN_NAME = 'id'
      LIMIT 1
    `,
  );
  const idType = String(col?.dataType || '').toLowerCase();

  // Compatible with old schema: shipping_templates.id is VARCHAR(36) primary key.
  if (idType === 'varchar' || idType === 'char') {
    const createdId = generateId();
    await db.query(
      `INSERT INTO shipping_templates (id, name, regions, base_fee, free_above, extra_per_kg, enabled) VALUES (?,?,?,?,?,?,?)`,
      [createdId, name, regions, baseFee, freeAbove, extraPerKg, enabled],
    );
    return createdId;
  }

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
  const [rows] = await db.query(
    `SELECT * FROM content_pages
     WHERE deleted_at IS NULL
     ORDER BY last_modified_at DESC, id ASC`,
  );
  return rows;
}

async function selectContentPageBySlug(slug) {
  const [[row]] = await db.query(
    'SELECT id, slug, title, publish_status FROM content_pages WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
    [slug],
  );
  return row || null;
}

async function insertContentPage(params) {
  await db.query(
    `INSERT INTO content_pages (id, slug, title, body, publish_status, last_modified_by, last_modified_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      params.id,
      params.slug,
      params.title,
      params.body || '',
      params.publish_status || 'published',
      params.last_modified_by || null,
    ],
  );
}

/** 内容页更新前审计快照（仅 id / title / slug / content 长度） */
async function selectContentPageAuditSnapshotById(id) {
  const [[row]] = await db.query(
    'SELECT id, title, slug, CHAR_LENGTH(IFNULL(body,"")) AS content_len FROM content_pages WHERE id = ?',
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

async function updateOrderRefundStateConn(conn, orderId, params = {}) {
  const { status, payment_status, refund_status } = params;
  await q(conn).query(
    'UPDATE orders SET status = ?, payment_status = ?, refund_status = ? WHERE id = ?',
    [status, payment_status, refund_status, orderId],
  );
}

async function selectOrderItemsConn(conn, orderId) {
  const [orderItems] = await q(conn).query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ?',
    [orderId],
  );
  return orderItems;
}

async function selectOrderItemsWithVariantConn(conn, orderId) {
  const [orderItems] = await q(conn).query(
    'SELECT product_id, variant_id, qty FROM order_items WHERE order_id = ?',
    [orderId],
  );
  return orderItems;
}

async function addProductStockConn(conn, productId, qty) {
  await q(conn).query('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, productId]);
}

async function ensurePointsAccountConn(conn, userId) {
  await q(conn).query(
    `INSERT IGNORE INTO points_accounts (user_id, balance, total_earned)
     SELECT id, COALESCE(points_balance, 0), GREATEST(COALESCE(points_balance, 0), 0)
     FROM users WHERE id = ?`,
    [userId],
  );
}

async function syncUserPointsFromAccountConn(conn, userId) {
  await q(conn).query(
    `UPDATE users u
     JOIN points_accounts pa ON pa.user_id = u.id
     SET u.points_balance = pa.balance
     WHERE u.id = ?`,
    [userId],
  );
}

async function deductUserPointsConn(conn, userId, points) {
  const amount = Math.max(Number(points) || 0, 0);
  await ensurePointsAccountConn(conn, userId);
  await q(conn).query(
    `UPDATE points_accounts
     SET balance = GREATEST(0, balance - ?),
         total_spent = total_spent + ?,
         total_reversed = total_reversed + ?
     WHERE user_id = ?`,
    [amount, amount, amount, userId],
  );
  await syncUserPointsFromAccountConn(conn, userId);
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

async function insertPaymentRefundEventConn(conn, params = {}) {
  await q(conn).query(
    `INSERT INTO payment_events
      (id, payment_order_id, order_id, provider, provider_event_id, event_type, verify_status, processing_result, payload_json, error_message)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      generateId(),
      null,
      params.orderId,
      params.provider || 'manual',
      'ret_' + Date.now(),
      'refund.approved',
      'success',
      params.mode === 'full' ? 'refunded' : 'partially_refunded',
      JSON.stringify({ amount: params.amount || 0, reason: params.reason || '' }),
      '',
    ],
  );
}

async function updateReturnByFieldsConn(conn, setFragments, values, id) {
  await q(conn).query(
    `UPDATE return_requests SET ${setFragments.join(', ')} WHERE id = ?`,
    [...values, id],
  );
}

async function addProductStockFallbackConn(conn, productId, qty) {
  await q(conn).query('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, productId]);
}

async function restoreVariantStockByReturnConn(conn, variantId, qty, meta = {}) {
  const [[beforeRow]] = await q(conn).query(
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
  await q(conn).query('UPDATE product_variants SET stock = ? WHERE id = ?', [afterStock, variantId]);
  await q(conn).query(
    `UPDATE products p
     SET p.stock = COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id), p.stock)
     WHERE p.id = ?`,
    [beforeRow.product_id],
  );
  await q(conn).query(
    `INSERT INTO inventory_stock_records
       (id, product_id, variant_id, change_type, quantity_delta, before_stock, after_stock,
        reason, ref_type, ref_id, operator_id, product_name_snapshot, variant_name_snapshot,
        sku_code_snapshot, order_no_snapshot, source_no, remark, created_by_type)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      generateId(),
      beforeRow.product_id,
      variantId,
      'order_release',
      Number(qty || 0),
      beforeStock,
      afterStock,
      meta.reason || '售后恢复库存',
      'return',
      meta.returnId || '',
      meta.operatorId || null,
      beforeRow.product_name || '',
      beforeRow.title || '',
      beforeRow.sku_code || '',
      meta.orderNo || '',
      meta.sourceNo || '',
      meta.remark || '',
      'admin',
    ],
  );
  return 1;
}

async function selectPaymentEventsByOrderId(orderId) {
  const [rows] = await db.query(
    `SELECT id, payment_order_id, order_id, provider, provider_event_id, event_type, verify_status,
            processing_result, payload_json, error_message, created_at
     FROM payment_events
     WHERE order_id = ?
     ORDER BY created_at DESC`,
    [orderId],
  );
  return rows;
}

async function selectInventoryRecordsByReturnId(returnId, orderId) {
  const [rows] = await db.query(
    `SELECT *
     FROM inventory_stock_records
     WHERE (ref_type = 'return' AND ref_id = ?)
        OR (ref_type = 'order_release' AND ref_id = ?)
     ORDER BY created_at DESC`,
    [returnId, orderId || ''],
  );
  return rows;
}

async function selectAuditLogsByReturnId(returnId) {
  const [rows] = await db.query(
    `SELECT id, action_type, summary, before_json, after_json, result, error_message, ip_address, user_agent, created_at, operator_id
     FROM audit_logs
     WHERE object_type = 'return_request' AND object_id = ?
     ORDER BY created_at DESC`,
    [returnId],
  );
  return rows;
}

module.exports = {
  getPool,
  getConnection,
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
  selectProductTagById,
  updateProductTag,
  deleteProductTag,
  selectReturnById,
  selectReturnDetailById,
  selectShippingTemplatesRaw,
  insertShippingTemplate,
  updateShippingTemplateByFields,
  deleteShippingTemplate,
  selectPointsRules,
  updatePointsRuleByFields,
  selectReferralRules,
  updateReferralRuleByFields,
  selectContentPages,
  selectContentPageBySlug,
  insertContentPage,
  selectContentPageAuditSnapshotById,
  updateContentPageByFields,
  selectReturnByIdConn,
  updateReturnApprovedConn,
  selectOrderByIdConn,
  updateOrderStatusConn,
  updateOrderRefundStateConn,
  selectOrderItemsConn,
  selectOrderItemsWithVariantConn,
  addProductStockConn,
  deductUserPointsConn,
  insertPointsRecordConn,
  restoreUserCouponConn,
  insertNotificationConn,
  insertPaymentRefundEventConn,
  updateReturnByFieldsConn,
  addProductStockFallbackConn,
  restoreVariantStockByReturnConn,
  selectPaymentEventsByOrderId,
  selectInventoryRecordsByReturnId,
  selectAuditLogsByReturnId,
};
