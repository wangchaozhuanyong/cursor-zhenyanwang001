const db = require('../../../config/db');
const { isSchemaDriftError } = require('../../../db/schemaErrors');
const { klDateTimeSql } = require('../../../utils/couponBusinessTime');

function getPool() {
  return db;
}

const COUPON_CATEGORY_SELECT = `
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
            ) AS category_names`;

const COUPON_CAMPAIGN_START_EXPR = "COALESCE(c.campaign_start_at, c.claim_start_at, CONCAT(c.start_date, ' 00:00:00'))";
const COUPON_CAMPAIGN_END_EXPR = "COALESCE(c.campaign_end_at, c.claim_end_at, CONCAT(c.end_date, ' 23:59:59'))";

function couponPositionJsonContains() {
  return "JSON_CONTAINS(COALESCE(c.display_positions, '[]'), JSON_QUOTE(?), '$')";
}

function legacyStatusWhere(status, params) {
  if (!status || status === 'all') return '';
  if (status === 'available') {
    return " AND uc.status = 'available'";
  }
  params.push(status);
  return ' AND BINARY uc.status = BINARY ?';
}

function statusWhere(status, params) {
  if (!status || status === 'all') return '';
  if (status === 'available') {
    return ` AND uc.status = 'available'
      AND (uc.valid_from IS NULL OR uc.valid_from <= UTC_TIMESTAMP())
      AND (uc.valid_until IS NULL OR uc.valid_until >= UTC_TIMESTAMP())
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.invalidated_at IS NULL
      AND c.stop_use_at IS NULL
      AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
      AND c.status IN ('available', 'active')`;
  }
  if (status === 'pending') {
    return " AND (uc.status = 'pending' OR (uc.status = 'available' AND uc.valid_from IS NOT NULL AND uc.valid_from > UTC_TIMESTAMP()))";
  }
  if (status === 'expired') {
    return " AND (uc.status = 'expired' OR (uc.status IN ('available','pending') AND uc.valid_until IS NOT NULL AND uc.valid_until < UTC_TIMESTAMP()))";
  }
  params.push(status);
  return ' AND BINARY uc.status = BINARY ?';
}

const ACTIVE_COUPON_TEMPLATE_WHERE = `
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.invalidated_at IS NULL
      AND c.stop_use_at IS NULL
      AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
      AND c.status IN ('available', 'active')`;

const CLAIMABLE_COUPON_TEMPLATE_WHERE = `
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.invalidated_at IS NULL
      AND c.stop_claim_at IS NULL
      AND c.stop_use_at IS NULL
      AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
      AND c.status IN ('available', 'active')`;

async function countUserCoupons(userId, status) {
  let where = 'WHERE BINARY uc.user_id = BINARY ?';
  const params = [userId];
  where += statusWhere(status, params);
  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM user_coupons uc
       LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
       ${where}`,
      params,
    );
    return total;
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    const legacyParams = [userId];
    const legacyWhere = `WHERE BINARY uc.user_id = BINARY ?${legacyStatusWhere(status, legacyParams)}`;
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM user_coupons uc ${legacyWhere}`,
      legacyParams,
    );
    return total;
  }
}

async function selectUserCouponsPage(userId, status, pageSize, offset) {
  let where = 'WHERE BINARY uc.user_id = BINARY ?';
  const params = [userId];
  where += statusWhere(status, params);
  try {
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
              c.deleted_at, c.archived_at, c.invalidated_at, c.stop_use_at,
              c.campaign_start_at, c.campaign_end_at, c.post_end_valid_days,
              ${COUPON_CATEGORY_SELECT}
       FROM user_coupons uc
       LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
       ${where}
       ORDER BY uc.claimed_at DESC, uc.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    return rows;
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    const legacyParams = [userId];
    const legacyWhere = `WHERE BINARY uc.user_id = BINARY ?${legacyStatusWhere(status, legacyParams)}`;
    const [rows] = await db.query(
      `SELECT uc.id, uc.claimed_at, uc.used_at, uc.status,
              c.id AS coupon_id, c.code, c.title, c.type, c.value,
              c.min_amount, c.start_date, c.end_date, c.status AS coupon_status,
              c.description, c.scope_type, c.display_badge,
              ${COUPON_CATEGORY_SELECT}
       FROM user_coupons uc
       LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
       ${legacyWhere}
       ORDER BY uc.claimed_at DESC, uc.id DESC
       LIMIT ? OFFSET ?`,
      [...legacyParams, pageSize, offset],
    );
    return rows;
  }
}

async function selectCheckoutCandidateUserCoupons(userId, limit = 1000) {
  const pageSize = Math.max(1, Math.min(1000, Number(limit) || 1000));
  try {
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
              c.deleted_at, c.archived_at, c.invalidated_at, c.stop_use_at,
              c.campaign_start_at, c.campaign_end_at, c.post_end_valid_days,
              ${COUPON_CATEGORY_SELECT}
       FROM user_coupons uc
       JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
       WHERE BINARY uc.user_id = BINARY ?
         AND uc.status IN ('available', 'pending')
         AND (uc.valid_from IS NULL OR uc.valid_from <= UTC_TIMESTAMP())
         AND (uc.valid_until IS NULL OR uc.valid_until >= UTC_TIMESTAMP())
         ${ACTIVE_COUPON_TEMPLATE_WHERE}
       ORDER BY uc.claimed_at DESC, uc.id DESC
       LIMIT ?`,
      [userId, pageSize],
    );
    return rows;
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    return selectUserCouponsPage(userId, 'available', pageSize, 0);
  }
}

async function selectAvailableCouponsLegacy() {
  const [rows] = await db.query(
    `SELECT c.*, ${COUPON_CATEGORY_SELECT}
     FROM coupons c
     WHERE c.status = 'available'
       AND c.end_date >= CURDATE()
       AND c.start_date <= CURDATE()
     ORDER BY c.end_date DESC, c.id DESC`,
  );
  return rows;
}

async function selectAvailableCoupons() {
  try {
    const [rows] = await db.query(
      `SELECT c.*, ${COUPON_CATEGORY_SELECT}
       FROM coupons c
       WHERE c.deleted_at IS NULL
         AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
         AND c.status IN ('available', 'active')
         AND (
           ${COUPON_CAMPAIGN_START_EXPR} IS NULL
           OR ${klDateTimeSql(COUPON_CAMPAIGN_START_EXPR)} <= UTC_TIMESTAMP()
         )
         AND (
           ${COUPON_CAMPAIGN_END_EXPR} IS NULL
           OR ${klDateTimeSql(COUPON_CAMPAIGN_END_EXPR)} >= UTC_TIMESTAMP()
         )
         AND c.stop_claim_at IS NULL
         AND c.stop_use_at IS NULL
         AND c.archived_at IS NULL
         AND c.invalidated_at IS NULL
         AND (
           c.total_quantity <= 0
           OR COALESCE(c.claimed_count, 0) < c.total_quantity
         )
       ORDER BY c.created_at DESC`,
    );
    return rows;
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    return selectAvailableCouponsLegacy();
  }
}

async function selectAvailableCouponsByDisplayPositions(positions, limit = 50) {
  const normalized = [...new Set((positions || []).map((x) => String(x || '').trim()).filter(Boolean))];
  if (!normalized.length) return [];
  const pageSize = Math.max(1, Math.min(50, Number(limit) || 50));
  const positionWhere = normalized.map(() => couponPositionJsonContains()).join(' OR ');
  try {
    const [rows] = await db.query(
      `SELECT c.*, ${COUPON_CATEGORY_SELECT}
       FROM coupons c
       WHERE c.deleted_at IS NULL
         AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
         AND c.status IN ('available', 'active')
         AND (c.claim_start_at IS NULL OR c.claim_start_at <= NOW())
         AND (c.claim_end_at IS NULL OR c.claim_end_at >= NOW())
         AND c.stop_claim_at IS NULL
         AND c.stop_use_at IS NULL
         AND c.archived_at IS NULL
         AND c.invalidated_at IS NULL
         AND COALESCE(c.auto_issue, 0) = 0
         AND (
           c.total_quantity <= 0
           OR COALESCE(c.claimed_count, 0) < c.total_quantity
         )
         AND (${positionWhere})
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [...normalized, pageSize],
    );
    return rows;
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    return [];
  }
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
  try {
    const [[row]] = await db.query(
      `SELECT c.*, ${COUPON_CATEGORY_SELECT}
       FROM coupons c
       WHERE (BINARY c.code = BINARY ? OR BINARY c.id = BINARY ?)
         AND c.deleted_at IS NULL`,
      [code, code],
    );
    return row || null;
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    const [[row]] = await db.query(
      `SELECT c.*, ${COUPON_CATEGORY_SELECT}
       FROM coupons c
       WHERE BINARY c.code = BINARY ? OR BINARY c.id = BINARY ?`,
      [code, code],
    );
    return row || null;
  }
}

async function selectCouponByCodeOrIdForUpdate(q, code) {
  const [[row]] = await q.query(
    `SELECT c.*, ${COUPON_CATEGORY_SELECT}
     FROM coupons c
     WHERE (BINARY c.code = BINARY ? OR BINARY c.id = BINARY ?)
       ${CLAIMABLE_COUPON_TEMPLATE_WHERE}
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
  try {
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
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    await q.query(
      'INSERT INTO user_coupons (id, user_id, coupon_id, claimed_at, status) VALUES (?,?,?,NOW(),?)',
      [row.id, row.userId, row.couponId, row.status || 'available'],
    );
  }
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

async function incrementClaimedCountIfAvailableLegacy(q, couponId) {
  try {
    const [[coupon]] = await q.query(
      'SELECT id, total_quantity FROM coupons WHERE BINARY id = BINARY ? FOR UPDATE',
      [couponId],
    );
    if (!coupon) return 0;
    const totalQty = Number(coupon.total_quantity || 0);
    if (totalQty <= 0) return 1;
    const [[row]] = await q.query(
      'SELECT COUNT(*) AS cnt FROM user_coupons WHERE BINARY coupon_id = BINARY ?',
      [couponId],
    );
    return Number(row?.cnt || 0) < totalQty ? 1 : 0;
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    return 1;
  }
}

async function incrementClaimedCountIfAvailable(q, couponId) {
  try {
    const [result] = await q.query(
      `UPDATE coupons
          SET claimed_count = COALESCE(claimed_count, 0) + 1
        WHERE BINARY id = BINARY ?
          AND deleted_at IS NULL
          AND (total_quantity <= 0 OR COALESCE(claimed_count, 0) < total_quantity)`,
      [couponId],
    );
    return Number(result?.affectedRows || 0);
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    return incrementClaimedCountIfAvailableLegacy(q, couponId);
  }
}

async function incrementUsedCount(q, couponId) {
  await q.query(
    'UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE BINARY id = BINARY ?',
    [couponId],
  ).catch(() => {});
}

async function decrementUsedCount(q, couponId) {
  await q.query(
    'UPDATE coupons SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1) WHERE BINARY id = BINARY ?',
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
  ).catch((err) => {
    console.warn('[coupon_events] write failed:', err?.message || err);
  });
}

async function selectExpiredUserCoupons(q, limit) {
  const [rows] = await q.query(
    `SELECT id, coupon_id, user_id
       FROM user_coupons
      WHERE status IN ('available', 'pending')
        AND valid_until IS NOT NULL
        AND valid_until < UTC_TIMESTAMP()
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
     WHERE user_id = ?
       AND (
         payment_status IN ('paid', 'partially_refunded')
         OR status IN ('paid', 'shipped', 'completed', 'refunding', 'refunded')
       )`,
    [userId],
  );
  return Number(row?.cnt || 0);
}

module.exports = {
  getPool,
  countUserCoupons,
  selectUserCouponsPage,
  selectCheckoutCandidateUserCoupons,
  selectAvailableCoupons,
  selectAvailableCouponsByDisplayPositions,
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
  decrementUsedCount,
  insertCouponEvent,
  selectExpiredUserCoupons,
  markUserCouponsExpired,
  selectUserCouponForRestore,
  updateUserCouponAfterRestore,
  selectUserOrderCount,
};
