const db = require('../../../config/db');

function getPool() {
  return db;
}

function statusWhere(status, params) {
  if (!status || status === 'all') return '';
  if (status === 'available') {
    return " AND uc.status = 'available' AND (uc.valid_from IS NULL OR uc.valid_from <= NOW()) AND (uc.valid_until IS NULL OR uc.valid_until >= NOW())";
  }
  if (status === 'pending') {
    return " AND (uc.status = 'pending' OR (uc.status = 'available' AND uc.valid_from IS NOT NULL AND uc.valid_from > NOW()))";
  }
  if (status === 'expired') {
    return " AND (uc.status = 'expired' OR (uc.status IN ('available','pending') AND uc.valid_until IS NOT NULL AND uc.valid_until < NOW()))";
  }
  params.push(status);
  return ' AND BINARY uc.status = BINARY ?';
}

async function countUserCoupons(userId, status) {
  let where = 'WHERE BINARY uc.user_id = BINARY ?';
  const params = [userId];
  where += statusWhere(status, params);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM user_coupons uc
     LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
     ${where}`,
    params,
  );
  return total;
}

async function selectUserCouponsPage(userId, status, pageSize, offset) {
  let where = 'WHERE BINARY uc.user_id = BINARY ?';
  const params = [userId];
  where += statusWhere(status, params);
  const [rows] = await db.query(
    `SELECT uc.id, uc.claimed_at, uc.used_at, uc.status,
            uc.coupon_snapshot, uc.valid_from, uc.valid_until, uc.issue_channel,
            uc.issue_activity_id, uc.source_admin_id, uc.order_id, uc.order_no,
            uc.discount_amount, uc.invalid_reason, uc.returned_at, uc.return_reason, uc.locked_at,
            c.id AS coupon_id, c.code, c.title, c.type, c.value,
            c.min_amount, c.start_date, c.end_date, c.status AS coupon_status,
            c.publish_status AS coupon_publish_status, c.description,
            c.scope_type, c.display_badge, c.usable_scope_type, c.usable_product_ids,
            c.usable_category_ids, c.stackable_with_activity,
            (
              SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
              FROM coupon_categories cc
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_ids,
            (
              SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
              FROM coupon_categories cc
              JOIN categories cat ON BINARY cat.id = BINARY cc.category_id
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_names
     FROM user_coupons uc
     LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
     ${where}
     ORDER BY uc.claimed_at DESC, uc.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectAvailableCoupons() {
  const [rows] = await db.query(
    `SELECT c.*,
            (
              SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
              FROM coupon_categories cc
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_ids,
            (
              SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
              FROM coupon_categories cc
              JOIN categories cat ON BINARY cat.id = BINARY cc.category_id
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_names
     FROM coupons c
     WHERE c.deleted_at IS NULL
       AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
       AND c.status IN ('available', 'active')
       AND (c.claim_start_at IS NULL OR c.claim_start_at <= NOW())
       AND (c.claim_end_at IS NULL OR c.claim_end_at >= NOW())
       AND c.stop_claim_at IS NULL
       AND c.archived_at IS NULL
       AND c.invalidated_at IS NULL
       AND (
         c.total_quantity <= 0
         OR COALESCE(c.claimed_count, 0) < c.total_quantity
       )
     ORDER BY c.created_at DESC`,
  );
  return rows;
}

async function selectClaimedCouponIds(userId) {
  const [rows] = await db.query(
    'SELECT coupon_id FROM user_coupons WHERE BINARY user_id = BINARY ?',
    [userId],
  );
  return rows;
}

async function selectUserCouponClaimCounts(userId) {
  const [rows] = await db.query(
    `SELECT coupon_id, COUNT(*) AS cnt
     FROM user_coupons
     WHERE BINARY user_id = BINARY ?
     GROUP BY coupon_id`,
    [userId],
  );
  return rows;
}

async function selectCouponByCodeOrId(code) {
  const [[row]] = await db.query(
    `SELECT c.*,
            (
              SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
              FROM coupon_categories cc
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_ids,
            (
              SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
              FROM coupon_categories cc
              JOIN categories cat ON BINARY cat.id = BINARY cc.category_id
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_names
     FROM coupons c
     WHERE (BINARY c.code = BINARY ? OR BINARY c.id = BINARY ?)
       AND c.deleted_at IS NULL`,
    [code, code],
  );
  return row || null;
}

async function selectCouponByCodeOrIdForUpdate(q, code) {
  const [[row]] = await q.query(
    `SELECT c.*,
            (
              SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
              FROM coupon_categories cc
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_ids,
            (
              SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
              FROM coupon_categories cc
              JOIN categories cat ON BINARY cat.id = BINARY cc.category_id
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_names
     FROM coupons c
     WHERE (BINARY c.code = BINARY ? OR BINARY c.id = BINARY ?)
     FOR UPDATE`,
    [code, code],
  );
  return row || null;
}

async function findUserCoupon(userId, couponId) {
  const [[row]] = await db.query(
    'SELECT id FROM user_coupons WHERE BINARY user_id = BINARY ? AND BINARY coupon_id = BINARY ?',
    [userId, couponId],
  );
  return row || null;
}

async function insertUserCoupon(id, userId, couponId) {
  await db.query(
    'INSERT INTO user_coupons (id, user_id, coupon_id, claimed_at, status) VALUES (?,?,?,NOW(),?)',
    [id, userId, couponId, 'available'],
  );
}

async function insertUserCouponWithMeta(q, row) {
  await q.query(
    `INSERT INTO user_coupons
       (id, user_id, coupon_id, coupon_snapshot, claimed_at, status, valid_from, valid_until,
        issue_channel, issue_activity_id, source_admin_id)
     VALUES (?,?,?,?,NOW(),?,?,?,?,?,?)`,
    [
      row.id,
      row.userId,
      row.couponId,
      row.snapshot ? JSON.stringify(row.snapshot) : null,
      row.status || 'available',
      row.validFrom || null,
      row.validUntil || null,
      row.issueChannel || 'manual',
      row.issueActivityId || null,
      row.sourceAdminId || null,
    ],
  );
}

async function countUserClaimsForCoupon(userId, couponId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS cnt FROM user_coupons WHERE BINARY user_id = BINARY ? AND BINARY coupon_id = BINARY ?',
    [userId, couponId],
  );
  return Number(row?.cnt || 0);
}

async function countUserClaimsForCouponInConn(q, userId, couponId) {
  const [[row]] = await q.query(
    'SELECT COUNT(*) AS cnt FROM user_coupons WHERE BINARY user_id = BINARY ? AND BINARY coupon_id = BINARY ?',
    [userId, couponId],
  );
  return Number(row?.cnt || 0);
}

async function countTotalClaimsForCoupon(couponId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS cnt FROM user_coupons WHERE BINARY coupon_id = BINARY ?',
    [couponId],
  );
  return Number(row?.cnt || 0);
}

async function incrementClaimedCountIfAvailable(q, couponId) {
  const [result] = await q.query(
    `UPDATE coupons
        SET claimed_count = COALESCE(claimed_count, 0) + 1
      WHERE BINARY id = BINARY ?
        AND deleted_at IS NULL
        AND (total_quantity <= 0 OR COALESCE(claimed_count, 0) < total_quantity)`,
    [couponId],
  );
  return Number(result?.affectedRows || 0);
}

async function incrementUsedCount(q, couponId) {
  await q.query(
    'UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE BINARY id = BINARY ?',
    [couponId],
  ).catch(() => {});
}

async function insertCouponEvent(q, event) {
  await q.query(
    `INSERT INTO coupon_events
       (id, coupon_id, user_coupon_id, user_id, event_type, order_id, order_no, admin_user_id, reason, metadata)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      event.id,
      event.couponId,
      event.userCouponId || null,
      event.userId || null,
      event.eventType,
      event.orderId || null,
      event.orderNo || null,
      event.adminUserId || null,
      event.reason || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
    ],
  ).catch(() => {});
}

async function selectExpiredUserCoupons(q, limit) {
  const [rows] = await q.query(
    `SELECT id, coupon_id, user_id
       FROM user_coupons
      WHERE status IN ('available', 'pending')
        AND valid_until IS NOT NULL
        AND valid_until < NOW()
      LIMIT ?`,
    [limit],
  );
  return rows;
}

async function markUserCouponsExpired(q, ids, reason) {
  if (!Array.isArray(ids) || !ids.length) return;
  await q.query(
    `UPDATE user_coupons
        SET status = 'expired',
            invalid_reason = COALESCE(invalid_reason, ?)
      WHERE id IN (${ids.map(() => '?').join(',')})`,
    [reason, ...ids],
  );
}

async function selectUserCouponForRestore(q, userCouponId) {
  const [[row]] = await q.query(
    `SELECT uc.*, c.publish_status AS coupon_publish_status, c.status AS coupon_status,
            c.invalidated_at, c.stop_use_at, c.deleted_at
       FROM user_coupons uc
       LEFT JOIN coupons c ON BINARY c.id = BINARY uc.coupon_id
      WHERE BINARY uc.id = BINARY ?
      FOR UPDATE`,
    [userCouponId],
  );
  return row || null;
}

async function updateUserCouponAfterRestore(q, userCouponId, status, returnReason, invalidReason) {
  await q.query(
    `UPDATE user_coupons
        SET status = ?,
            used_at = NULL,
            returned_at = NOW(),
            return_reason = ?,
            invalid_reason = CASE WHEN ? IN ('expired','invalidated') THEN ? ELSE invalid_reason END,
            order_id = NULL,
            order_no = NULL,
            discount_amount = NULL,
            locked_at = NULL
      WHERE BINARY id = BINARY ?`,
    [status, returnReason, status, invalidReason, userCouponId],
  );
}

async function selectUserOrderCount(userId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE user_id = ? AND deleted_at IS NULL AND status NOT IN ('cancelled')`,
    [userId],
  );
  return Number(row?.cnt || 0);
}

module.exports = {
  getPool,
  countUserCoupons,
  selectUserCouponsPage,
  selectAvailableCoupons,
  selectClaimedCouponIds,
  selectUserCouponClaimCounts,
  selectCouponByCodeOrId,
  selectCouponByCodeOrIdForUpdate,
  findUserCoupon,
  insertUserCoupon,
  insertUserCouponWithMeta,
  countUserClaimsForCoupon,
  countUserClaimsForCouponInConn,
  countTotalClaimsForCoupon,
  incrementClaimedCountIfAvailable,
  incrementUsedCount,
  insertCouponEvent,
  selectExpiredUserCoupons,
  markUserCouponsExpired,
  selectUserCouponForRestore,
  updateUserCouponAfterRestore,
  selectUserOrderCount,
};


