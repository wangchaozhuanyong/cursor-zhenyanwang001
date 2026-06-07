const db = require('../../../config/db');

function couponListWhere(query = {}) {
  const where = ['c.deleted_at IS NULL', 'c.archived_at IS NULL'];
  const params = [];
  const keyword = String(query.keyword || query.search || '').trim();
  if (keyword) {
    where.push('(c.title LIKE ? OR c.code LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const publishStatus = String(query.publish_status || query.publishStatus || '').trim();
  if (publishStatus) {
    where.push('c.publish_status = ?');
    params.push(publishStatus);
  }
  return { where: where.join(' AND '), params };
}

function couponRecordWhere(query = {}, couponId = '') {
  const where = [];
  const params = [];
  if (couponId) {
    where.push('BINARY uc.coupon_id = BINARY ?');
    params.push(couponId);
  }
  const status = String(query.status || '').trim();
  if (status) {
    where.push(`(
      CASE
        WHEN uc.status = 'available' AND c.end_date < CURDATE() THEN 'expired'
        ELSE uc.status
      END
    ) = ?`);
    params.push(status);
  }
  const keyword = String(query.keyword || query.search || '').trim();
  if (keyword) {
    where.push('(u.nickname LIKE ? OR u.phone LIKE ? OR c.title LIKE ? OR c.code LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

async function countCoupons(query = {}) {
  const { where, params } = couponListWhere(query);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM coupons c WHERE ${where}`, params);
  return total;
}

async function selectCouponsPage(pageSize, offset, query = {}) {
  const { where, params } = couponListWhere(query);
  const [rows] = await db.query(
    `SELECT c.*,
            COALESCE(stats.claimed_count_real, 0) AS claimed_count_real,
            COALESCE(stats.used_count_real, 0) AS used_count_real,
            COALESCE(stats.expired_count_real, 0) AS expired_count_real,
            COALESCE(stats.available_count_real, 0) AS available_user_coupon_count,
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
     LEFT JOIN (
       SELECT coupon_id,
              COUNT(*) AS claimed_count_real,
              SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used_count_real,
              SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired_count_real,
              SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_count_real
         FROM user_coupons
        GROUP BY coupon_id
     ) stats ON BINARY stats.coupon_id = BINARY c.id
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function insertCoupon(params) {
  const columns = [
    'id', 'code', 'title', 'type', 'value', 'min_amount', 'start_date', 'end_date', 'description', 'scope_type',
    'display_badge', 'total_quantity', 'per_user_limit', 'new_user_only', 'member_only', 'auto_issue',
    'usable_scope_type', 'usable_product_ids', 'usable_category_ids', 'stackable_with_activity',
    'publish_status', 'claim_start_at', 'claim_end_at', 'campaign_start_at', 'campaign_end_at', 'post_end_valid_days',
    'display_positions', 'audience_type', 'audience_config', 'use_start_at', 'use_end_at', 'validity_mode',
    'valid_days_after_claim', 'follow_activity_id', 'source_campaign_id', 'source_coupon_id', 'issue_mode',
  ];
  const valuesByColumn = {
    id: params.id,
    code: params.code,
    title: params.title,
    type: params.type,
    value: params.value,
    min_amount: params.min_amount,
    start_date: params.start_date,
    end_date: params.end_date,
    description: params.description,
    scope_type: params.scope_type || 'all',
    display_badge: params.display_badge || '',
    total_quantity: Number(params.total_quantity || 0),
    per_user_limit: Number(params.per_user_limit || 1),
    new_user_only: params.new_user_only ? 1 : 0,
    member_only: params.member_only ? 1 : 0,
    auto_issue: params.auto_issue ? 1 : 0,
    usable_scope_type: params.usable_scope_type || 'all',
    usable_product_ids: params.usable_product_ids ? JSON.stringify(params.usable_product_ids) : null,
    usable_category_ids: params.usable_category_ids ? JSON.stringify(params.usable_category_ids) : null,
    stackable_with_activity: params.stackable_with_activity === false ? 0 : 1,
    publish_status: params.publish_status || 'active',
    claim_start_at: params.claim_start_at || null,
    claim_end_at: params.claim_end_at || null,
    campaign_start_at: params.campaign_start_at || params.claim_start_at || null,
    campaign_end_at: params.campaign_end_at || params.claim_end_at || null,
    post_end_valid_days: Number(params.post_end_valid_days || 0),
    display_positions: params.display_positions ? JSON.stringify(params.display_positions) : JSON.stringify(['home_coupon_zone']),
    audience_type: params.audience_type || 'all',
    audience_config: params.audience_config ? JSON.stringify(params.audience_config) : null,
    use_start_at: params.use_start_at || null,
    use_end_at: params.use_end_at || null,
    validity_mode: params.validity_mode || 'absolute',
    valid_days_after_claim: params.valid_days_after_claim == null ? null : Number(params.valid_days_after_claim),
    follow_activity_id: params.follow_activity_id || null,
    source_campaign_id: params.source_campaign_id || null,
    source_coupon_id: params.source_coupon_id || params.id,
    issue_mode: params.issue_mode || (params.auto_issue ? 'auto' : 'manual'),
  };
  await db.query(
    `INSERT INTO coupons
      (${columns.join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map((column) => valuesByColumn[column]),
  );
}

async function selectCouponById(id) {
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
     WHERE BINARY c.id = BINARY ?`,
    [id],
  );
  return row || null;
}

async function updateCouponDynamic(setFragments, values, id) {
  await db.query(`UPDATE coupons SET ${setFragments.join(', ')} WHERE BINARY id = BINARY ?`, [...values, id]);
}

async function deleteCouponById(id, deletedBy) {
  await db.query('UPDATE coupons SET deleted_at = NOW(), deleted_by = ? WHERE BINARY id = BINARY ?', [deletedBy || null, id]);
}

async function restoreCouponById(id) {
  await db.query('UPDATE coupons SET deleted_at = NULL, deleted_by = NULL WHERE BINARY id = BINARY ?', [id]);
}

async function clearCouponCategories(couponId) {
  await db.query('DELETE FROM coupon_categories WHERE BINARY coupon_id = BINARY ?', [couponId]);
}

async function insertCouponCategory(id, couponId, categoryId) {
  await db.query(
    `INSERT IGNORE INTO coupon_categories (id, coupon_id, category_id)
     VALUES (?,?,?)`,
    [id, couponId, categoryId],
  );
}

async function countAllUserCoupons(query = {}) {
  const { whereSql, params } = couponRecordWhere(query);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM user_coupons uc
       LEFT JOIN users u ON BINARY uc.user_id = BINARY u.id
       LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
       ${whereSql}`,
    params,
  );
  return total;
}

async function selectAllCouponRecordsPage(pageSize, offset, query = {}) {
  const { whereSql, params } = couponRecordWhere(query);
  const [rows] = await db.query(
    `SELECT uc.*,
            CASE
              WHEN uc.status = 'available' AND c.end_date < CURDATE() THEN 'expired'
              ELSE uc.status
            END AS status,
            u.nickname, u.phone, c.title AS coupon_title
     FROM user_coupons uc
     LEFT JOIN users u ON BINARY uc.user_id = BINARY u.id
     LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
     ${whereSql}
     ORDER BY uc.claimed_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function countUserCouponsByCouponId(couponId, query = {}) {
  const { whereSql, params } = couponRecordWhere(query, couponId);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM user_coupons uc
       LEFT JOIN users u ON BINARY uc.user_id = BINARY u.id
       LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
       ${whereSql}`,
    params,
  );
  return total;
}

async function countOpenUserCouponsByCouponId(couponId) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM user_coupons
      WHERE BINARY coupon_id = BINARY ?
        AND status IN ('available', 'pending')
        AND (valid_until IS NULL OR valid_until >= NOW())`,
    [couponId],
  );
  return Number(total || 0);
}

async function selectCouponRecordsPage(couponId, pageSize, offset, query = {}) {
  const { whereSql, params } = couponRecordWhere(query, couponId);
  const [rows] = await db.query(
    `SELECT uc.*,
            CASE
              WHEN uc.status = 'available' AND c.end_date < CURDATE() THEN 'expired'
              ELSE uc.status
            END AS status,
            u.nickname, u.phone, c.title AS coupon_title
     FROM user_coupons uc
     LEFT JOIN users u ON BINARY uc.user_id = BINARY u.id
     LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
     ${whereSql}
     ORDER BY uc.claimed_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectCouponBaseById(couponId) {
  const [[row]] = await db.query(
    `SELECT *
     FROM coupons
     WHERE BINARY id = BINARY ? LIMIT 1`,
    [couponId],
  );
  return row || null;
}

async function selectUserIdsByTagIds(tagIds) {
  if (!Array.isArray(tagIds) || !tagIds.length) return [];
  const placeholders = tagIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT DISTINCT u.id
     FROM users u
     INNER JOIN user_tag_assignments uta ON uta.user_id = u.id
     WHERE u.deleted_at IS NULL
       AND (u.account_status IS NULL OR u.account_status = 'normal')
       AND uta.tag_id IN (${placeholders})`,
    tagIds,
  );
  return rows.map((r) => r.id);
}

async function invalidateUsableUserCouponsByCoupon(couponId, reason) {
  const [result] = await db.query(
    `UPDATE user_coupons
        SET status = 'invalidated',
            invalid_reason = ?
      WHERE BINARY coupon_id = BINARY ?
        AND status IN ('available','pending')`,
    [reason, couponId],
  );
  return result;
}

async function batchIssueCouponToUsers(couponId, userIds, genId, options = {}) {
  if (!Array.isArray(userIds) || !userIds.length) return 0;
  const perUserLimit = Math.max(1, Number(options.perUserLimit || 1));
  let remaining = Number.isFinite(Number(options.remaining)) ? Math.max(0, Number(options.remaining)) : Infinity;
  if (remaining <= 0) return 0;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let affected = 0;
    for (const userId of userIds) {
      if (remaining <= 0) break;
      const [exists] = await conn.query(
        'SELECT COUNT(*) AS cnt FROM user_coupons WHERE BINARY user_id = BINARY ? AND BINARY coupon_id = BINARY ?',
        [userId, couponId],
      );
      const userClaims = Number(exists?.[0]?.cnt || 0);
      if (userClaims >= perUserLimit) continue;
      const [r] = await conn.query(
        'INSERT INTO user_coupons (id, user_id, coupon_id, claimed_at, status) VALUES (?,?,?,NOW(),?)',
        [genId(), userId, couponId, 'available'],
      );
      const inserted = Number(r?.affectedRows || 0);
      affected += inserted;
      remaining -= inserted;
    }
    await conn.commit();
    return affected;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  getPool: () => db,
  countCoupons,
  selectCouponsPage,
  insertCoupon,
  selectCouponById,
  updateCouponDynamic,
  deleteCouponById,
  restoreCouponById,
  clearCouponCategories,
  insertCouponCategory,
  countAllUserCoupons,
  selectAllCouponRecordsPage,
  countUserCouponsByCouponId,
  countOpenUserCouponsByCouponId,
  selectCouponRecordsPage,
  selectCouponBaseById,
  selectUserIdsByTagIds,
  invalidateUsableUserCouponsByCoupon,
  batchIssueCouponToUsers,
};
