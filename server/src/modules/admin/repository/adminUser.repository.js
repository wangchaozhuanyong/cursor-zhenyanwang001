const db = require('../../../config/db');
const { ORDER_STATUS, PAID_PAYMENT_STATUS_LIST } = require('../../../constants/status');
const PAID_PAYMENT_PLACEHOLDERS = PAID_PAYMENT_STATUS_LIST.map(() => '?').join(', ');

const tableColumnCache = new Map();
const ADMIN_ACCOUNT_EXCLUSION_SQL = `
  AND u.role NOT IN ('admin', 'super_admin')
  AND NOT (
    u.role = 'disabled'
    AND EXISTS (SELECT 1 FROM user_roles ur_admin WHERE ur_admin.user_id = u.id)
  )
`;

async function getTableColumns(tableName) {
  if (tableColumnCache.has(tableName)) return tableColumnCache.get(tableName);
  const [rows] = await db.query(`SHOW COLUMNS FROM \`${tableName}\``);
  const columns = new Set(rows.map((row) => row.Field));
  tableColumnCache.set(tableName, columns);
  return columns;
}

async function hasTableColumn(tableName, columnName) {
  try {
    const columns = await getTableColumns(tableName);
    return columns.has(columnName);
  } catch {
    return false;
  }
}

async function safeRelation(label, loader, fallback) {
  try {
    return await loader();
  } catch (err) {
    console.warn(`[adminUser.detail] skipped ${label}: ${err?.message || err}`);
    return fallback;
  }
}

function buildUserListWhere(keyword, tagId, filters = {}) {
  let where = `WHERE u.deleted_at IS NULL ${ADMIN_ACCOUNT_EXCLUSION_SQL}`;
  const params = [];
  if (keyword) {
    where += ` AND (
      u.nickname LIKE ? OR u.phone LIKE ? OR u.wechat LIKE ? OR u.whatsapp LIKE ?
      OR u.invite_code LIKE ? OR u.parent_invite_code LIKE ? OR u.id LIKE ?
    )`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (tagId) {
    where += ' AND EXISTS (SELECT 1 FROM user_tag_assignments uta WHERE uta.user_id = u.id AND uta.tag_id = ?)';
    params.push(tagId);
  }
  if (filters.wechatBound === '1' || filters.wechatBound === true) {
    where += ` AND EXISTS (
      SELECT 1 FROM user_auth_identities uai
      WHERE uai.user_id = u.id AND uai.provider = 'wechat_open'
    )`;
  } else if (filters.wechatBound === '0' || filters.wechatBound === false) {
    where += ` AND NOT EXISTS (
      SELECT 1 FROM user_auth_identities uai
      WHERE uai.user_id = u.id AND uai.provider = 'wechat_open'
    )`;
  }
  if (filters.phoneBound === '0' || filters.phoneBound === false) {
    where += ' AND (u.phone IS NULL OR TRIM(u.phone) = \'\')';
  } else if (filters.phoneBound === '1' || filters.phoneBound === true) {
    where += ' AND u.phone IS NOT NULL AND TRIM(u.phone) <> \'\'';
  }
  if (filters.memberLevelId) {
    where += ' AND u.member_level_id = ?';
    params.push(filters.memberLevelId);
  }
  if (filters.accountStatus) {
    where += ' AND u.account_status = ?';
    params.push(filters.accountStatus);
  }
  if (filters.orderRestricted === '1' || filters.orderRestricted === true) {
    where += ' AND COALESCE(ur.order_restricted, 0) = 1';
  } else if (filters.orderRestricted === '0' || filters.orderRestricted === false) {
    where += ' AND COALESCE(ur.order_restricted, 0) = 0';
  }
  if (filters.couponRestricted === '1' || filters.couponRestricted === true) {
    where += ' AND COALESCE(ur.coupon_restricted, 0) = 1';
  } else if (filters.couponRestricted === '0' || filters.couponRestricted === false) {
    where += ' AND COALESCE(ur.coupon_restricted, 0) = 0';
  }
  if (filters.commentRestricted === '1' || filters.commentRestricted === true) {
    where += ' AND COALESCE(ur.comment_restricted, 0) = 1';
  } else if (filters.commentRestricted === '0' || filters.commentRestricted === false) {
    where += ' AND COALESCE(ur.comment_restricted, 0) = 0';
  }
  if (filters.dateFrom) {
    where += ' AND u.created_at >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where += ' AND u.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(filters.dateTo);
  }
  if (filters.totalSpentMin !== undefined && filters.totalSpentMin !== '') {
    where += ' AND COALESCE(us.total_spent, 0) >= ?';
    params.push(Number(filters.totalSpentMin) || 0);
  }
  if (filters.totalSpentMax !== undefined && filters.totalSpentMax !== '') {
    where += ' AND COALESCE(us.total_spent, 0) <= ?';
    params.push(Number(filters.totalSpentMax) || 0);
  }
  if (filters.orderCountMin !== undefined && filters.orderCountMin !== '') {
    where += ' AND COALESCE(us.valid_order_count, 0) >= ?';
    params.push(Number(filters.orderCountMin) || 0);
  }
  if (filters.orderCountMax !== undefined && filters.orderCountMax !== '') {
    where += ' AND COALESCE(us.valid_order_count, 0) <= ?';
    params.push(Number(filters.orderCountMax) || 0);
  }
  if (filters.pointsMin !== undefined && filters.pointsMin !== '') {
    where += ' AND COALESCE(u.points_balance, 0) >= ?';
    params.push(Number(filters.pointsMin) || 0);
  }
  if (filters.pointsMax !== undefined && filters.pointsMax !== '') {
    where += ' AND COALESCE(u.points_balance, 0) <= ?';
    params.push(Number(filters.pointsMax) || 0);
  }
  if (filters.refundRateMin !== undefined && filters.refundRateMin !== '') {
    where += ' AND COALESCE(us.refund_rate, 0) >= ?';
    params.push(Number(filters.refundRateMin) || 0);
  }
  if (filters.refundRateMax !== undefined && filters.refundRateMax !== '') {
    where += ' AND COALESCE(us.refund_rate, 0) <= ?';
    params.push(Number(filters.refundRateMax) || 0);
  }
  return { where, params };
}

async function getConnection() {
  return db.getConnection();
}

async function countUsers(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM users u
     LEFT JOIN user_statistics us ON us.user_id = u.id
     LEFT JOIN user_restrictions ur ON ur.user_id = u.id
     ${where}`,
    params,
  );
  return total;
}

/**
 * @param {string} where
 * @param {any[]} params
 * @param {number} pageSize
 * @param {number} offset
 * @param {{ sortSql?: string }=} options
 */
async function selectUsersPage(where, params, pageSize, offset, options = {}) {
  const aliasedWhere = where.replace(/users\./g, 'u.');
  const sortSql = options.sortSql || 'u.created_at DESC';
  const [rows] = await db.query(
    `SELECT u.id, u.phone, u.nickname, u.avatar, u.invite_code, u.parent_invite_code,
            u.points_balance, u.subordinate_enabled, u.wechat, u.whatsapp, u.created_at,
            u.account_status,
            u.member_level_manual_locked,
            u.member_level_manual_reason,
            u.member_level_manual_at,
            COALESCE(ur.order_restricted, 0) AS order_restricted,
            COALESCE(ur.coupon_restricted, 0) AS coupon_restricted,
            COALESCE(ur.comment_restricted, 0) AS comment_restricted,
            COALESCE(us.total_spent, 0) AS total_spent,
            COALESCE(us.valid_order_count, 0) AS valid_order_count,
            COALESCE(us.average_order_value, 0) AS average_order_value,
            us.first_purchase_at,
            us.last_purchase_at,
            COALESCE(us.cancelled_order_count, 0) AS cancelled_order_count,
            COALESCE(us.refund_count, 0) AS refund_count,
            COALESCE(us.refund_rate, 0) AS refund_rate,
            ml.id AS member_level_id,
            ml.name AS member_level_name,
            ml.description AS member_level_description,
            ml.min_spent AS member_level_min_spent,
            ml.min_orders AS member_level_min_orders
     FROM users u
     LEFT JOIN user_statistics us ON us.user_id = u.id
     LEFT JOIN user_restrictions ur ON ur.user_id = u.id
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     ${aliasedWhere}
     ORDER BY ${sortSql} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectUsersForExport(where, params) {
  const aliasedWhere = where.replace(/users\./g, 'u.');
  const [rows] = await db.query(
    `SELECT u.id, u.phone, u.nickname, u.avatar, u.invite_code, u.parent_invite_code,
            u.points_balance, u.subordinate_enabled, u.wechat, u.whatsapp, u.created_at,
            u.account_status,
            COALESCE(ur.order_restricted, 0) AS order_restricted,
            COALESCE(ur.coupon_restricted, 0) AS coupon_restricted,
            COALESCE(ur.comment_restricted, 0) AS comment_restricted,
            ml.name AS member_level_name
     FROM users u
     LEFT JOIN user_statistics us ON us.user_id = u.id
     LEFT JOIN user_restrictions ur ON ur.user_id = u.id
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     ${aliasedWhere}
     ORDER BY u.created_at DESC`,
    params,
  );
  return rows;
}

async function selectTagsForUserIds(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return {};
  const placeholders = userIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT uta.user_id, ut.id, ut.name, ut.color, ut.description, ut.sort_order
     FROM user_tag_assignments uta
     INNER JOIN user_tags ut ON ut.id = uta.tag_id
     WHERE uta.user_id IN (${placeholders})
     ORDER BY ut.sort_order ASC, ut.created_at DESC`,
    userIds,
  );
  return rows.reduce((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = [];
    acc[row.user_id].push({
      id: row.id,
      name: row.name,
      color: row.color || '金色',
      description: row.description || '',
      sort_order: row.sort_order ?? 0,
    });
    return acc;
  }, {});
}

async function selectWechatIdentityByUserId(userId) {
  const [[row]] = await db.query(
    `SELECT id, provider_openid, provider_unionid, appid, nickname, avatar_url, bound_at
     FROM user_auth_identities
     WHERE user_id = ? AND provider = 'wechat_open'
     LIMIT 1`,
    [userId],
  );
  return row || null;
}

async function deleteWechatIdentityByUserId(userId) {
  const [r] = await db.query(
    `DELETE FROM user_auth_identities WHERE user_id = ? AND provider = 'wechat_open'`,
    [userId],
  );
  return (r.affectedRows || 0) > 0;
}

async function selectUserSummaryById(userId) {
  const [[user]] = await db.query(
    `SELECT u.id, u.phone, u.password_hash, u.nickname, u.avatar, u.invite_code, u.parent_invite_code,
            u.points_balance, u.subordinate_enabled, u.wechat, u.whatsapp,
            u.birthday, u.birthday_locked, u.birthday_updated_at, u.created_at,
            u.role, u.account_status,
            u.member_level_manual_locked,
            u.member_level_manual_reason,
            u.member_level_manual_at,
            COALESCE(ur.order_restricted, 0) AS order_restricted,
            COALESCE(ur.coupon_restricted, 0) AS coupon_restricted,
            COALESCE(ur.comment_restricted, 0) AS comment_restricted,
            ml.id AS member_level_id,
            ml.name AS member_level_name,
            ml.description AS member_level_description,
            ml.min_spent AS member_level_min_spent,
            ml.min_orders AS member_level_min_orders
     FROM users u
     LEFT JOIN user_restrictions ur ON ur.user_id = u.id
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     WHERE u.id = ?`,
    [userId],
  );
  return user || null;
}

async function selectProtectedAdminUserIds(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const ids = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT u.id
     FROM users u
     WHERE u.id IN (${placeholders})
       AND u.deleted_at IS NULL
       AND (
         u.role IN ('admin', 'super_admin')
         OR (
           u.role = 'disabled'
           AND EXISTS (SELECT 1 FROM user_roles ur_admin WHERE ur_admin.user_id = u.id)
         )
       )`,
    ids,
  );
  return rows.map((row) => row.id);
}

async function countOrdersByUserId(userId) {
  const [[{ orderCount }]] = await db.query(
    `SELECT COUNT(*) AS orderCount
     FROM orders
     WHERE user_id = ? AND payment_status IN (${PAID_PAYMENT_PLACEHOLDERS}) AND status != ?`,
    [userId, ...PAID_PAYMENT_STATUS_LIST, ORDER_STATUS.CANCELLED],
  );
  return orderCount;
}

async function sumUserSpentExcludingCancelled(userId) {
  const [[{ totalSpent }]] = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS totalSpent
     FROM orders
     WHERE user_id = ? AND payment_status IN (${PAID_PAYMENT_PLACEHOLDERS}) AND status != ?`,
    [userId, ...PAID_PAYMENT_STATUS_LIST, ORDER_STATUS.CANCELLED],
  );
  return totalSpent;
}

async function updateUserDynamic(setFragments, values, userId) {
  await db.query(`UPDATE users SET ${setFragments.join(', ')} WHERE id = ?`, [...values, userId]);
}

async function selectUserSummaryMetrics(where, params) {
  const [[row]] = await db.query(
    `SELECT
      SUM(CASE WHEN DATE(u.created_at) = CURDATE() THEN 1 ELSE 0 END) AS todayNew,
      SUM(CASE WHEN u.phone IS NOT NULL AND TRIM(u.phone) <> '' THEN 1 ELSE 0 END) AS phoneBound,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM user_auth_identities uai WHERE uai.user_id = u.id AND uai.provider = 'wechat_open') THEN 1 ELSE 0 END) AS wechatBound,
      SUM(CASE WHEN u.parent_invite_code IS NOT NULL AND TRIM(u.parent_invite_code) <> '' THEN 1 ELSE 0 END) AS invitedUsers,
      SUM(CASE WHEN u.account_status = 'disabled' THEN 1 ELSE 0 END) AS disabledUsers,
      SUM(CASE WHEN u.account_status = 'blacklisted' THEN 1 ELSE 0 END) AS blacklistedUsers,
      SUM(CASE WHEN COALESCE(ur.order_restricted, 0) = 1 THEN 1 ELSE 0 END) AS orderRestrictedUsers,
      SUM(CASE WHEN COALESCE(ur.coupon_restricted, 0) = 1 THEN 1 ELSE 0 END) AS couponRestrictedUsers,
      SUM(CASE WHEN COALESCE(ur.comment_restricted, 0) = 1 THEN 1 ELSE 0 END) AS commentRestrictedUsers
     FROM users u
     LEFT JOIN user_statistics us ON us.user_id = u.id
     LEFT JOIN user_restrictions ur ON ur.user_id = u.id
     ${where}`,
    params,
  );
  return row || {};
}

async function updateUserStatus(userId, accountStatus, bumpRefreshTokenVersion = false) {
  const sql = bumpRefreshTokenVersion
    ? 'UPDATE users SET account_status = ?, refresh_token_version = refresh_token_version + 1 WHERE id = ? AND deleted_at IS NULL'
    : 'UPDATE users SET account_status = ? WHERE id = ? AND deleted_at IS NULL';
  const [r] = await db.query(sql, [accountStatus, userId]);
  return (r.affectedRows || 0) > 0;
}

async function upsertUserRestrictions(userId, restrictions) {
  const orderRestricted = restrictions.order_restricted ? 1 : 0;
  const couponRestricted = restrictions.coupon_restricted ? 1 : 0;
  const commentRestricted = restrictions.comment_restricted ? 1 : 0;
  await db.query(
    `INSERT INTO user_restrictions (user_id, order_restricted, coupon_restricted, comment_restricted)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       order_restricted = VALUES(order_restricted),
       coupon_restricted = VALUES(coupon_restricted),
       comment_restricted = VALUES(comment_restricted)`,
    [userId, orderRestricted, couponRestricted, commentRestricted],
  );
}

async function selectUserRestrictions(userId) {
  const [[row]] = await db.query(
    `SELECT
      COALESCE(order_restricted, 0) AS order_restricted,
      COALESCE(coupon_restricted, 0) AS coupon_restricted,
      COALESCE(comment_restricted, 0) AS comment_restricted
     FROM user_restrictions
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );
  return {
    order_restricted: Number(row?.order_restricted || 0),
    coupon_restricted: Number(row?.coupon_restricted || 0),
    comment_restricted: Number(row?.comment_restricted || 0),
  };
}

async function selectLatestStatusAuditLog(userId) {
  const [[row]] = await db.query(
    `SELECT operator_id, operator_name, summary, after_json, created_at
     FROM audit_logs
     WHERE object_type = 'user'
       AND object_id = ?
       AND action_type IN ('user.status_update', 'user.account_status_update', 'user.restrictions_update')
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  return row || null;
}

async function selectUserDetailRelations(userId) {
  const [orders] = await safeRelation('recent_orders', () => db.query(
    `SELECT id, order_no, status, payment_status, total_amount, created_at
     FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
    [userId],
  ), [[]]);
  const addressHasCreatedAt = await hasTableColumn('addresses', 'created_at');
  const addressCreatedAtSelect = addressHasCreatedAt ? 'created_at' : 'NULL AS created_at';
  const addressOrderSql = addressHasCreatedAt ? 'is_default DESC, created_at DESC' : 'is_default DESC';
  const [addresses] = await safeRelation('addresses', () => db.query(
    `SELECT id, name, phone, address, is_default, ${addressCreatedAtSelect}
     FROM addresses WHERE user_id = ? ORDER BY ${addressOrderSql} LIMIT 20`,
    [userId],
  ), [[]]);
  const [[couponStats]] = await safeRelation('coupon_stats', () => db.query(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS usedCount
     FROM user_coupons WHERE user_id = ?`,
    [userId],
  ), [[{ total: 0, usedCount: 0 }]]);
  const [pointsRecords] = await safeRelation('points_records', () => db.query(
    `SELECT id, action, amount, balance_after, description, created_at
     FROM points_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [userId],
  ), [[]]);
  const [cashbackRecords] = await safeRelation('cashback_records', () => db.query(
    `SELECT id, order_no, type, amount, status, reason, created_at
     FROM reward_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [userId],
  ), [[]]);
  const [[inviteRelation]] = await safeRelation('invite_relation', () => db.query(
    `SELECT u.parent_invite_code,
            p.id AS parent_user_id, p.nickname AS parent_nickname, p.phone AS parent_phone
     FROM users u
     LEFT JOIN users p ON p.invite_code = u.parent_invite_code
     WHERE u.id = ?`,
    [userId],
  ), [[null]]);
  const [directInvites] = await safeRelation('direct_invites', () => db.query(
    `SELECT id, nickname, phone, created_at FROM users WHERE parent_invite_code = (SELECT invite_code FROM users WHERE id = ?) ORDER BY created_at DESC LIMIT 50`,
    [userId],
  ), [[]]);
  const [returns] = await safeRelation('after_sales', () => db.query(
    `SELECT id, order_id, status, reason, created_at FROM return_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [userId],
  ), [[]]);
  const [reviews] = await safeRelation('review_records', () => db.query(
    `SELECT id, product_id, rating, status, content, created_at FROM product_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [userId],
  ), [[]]);
  return {
    recent_orders: orders,
    addresses,
    coupon_stats: { total: Number(couponStats?.total || 0), used: Number(couponStats?.usedCount || 0) },
    points_records: pointsRecords,
    cashback_records: cashbackRecords,
    invite_relation: { parent: inviteRelation || null, direct_invites: directInvites || [] },
    after_sales: returns || [],
    review_records: reviews || [],
  };
}

async function findPhoneDuplicateByPhones(userId, phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const placeholders = phones.map(() => '?').join(',');
  const [[row]] = await db.query(
    `SELECT id FROM users WHERE phone IN (${placeholders}) AND id != ? LIMIT 1`,
    [...phones, userId],
  );
  return row || null;
}

async function selectUserTags() {
  const [rows] = await db.query(
    `SELECT ut.id, ut.name, ut.color, ut.description, ut.sort_order, ut.created_at,
            COUNT(uta.user_id) AS user_count
     FROM user_tags ut
     LEFT JOIN user_tag_assignments uta ON uta.tag_id = ut.id
     GROUP BY ut.id, ut.name, ut.color, ut.description, ut.sort_order, ut.created_at
     ORDER BY ut.sort_order ASC, ut.created_at DESC`,
  );
  return rows;
}

async function insertUserTag(tag) {
  await db.query(
    `INSERT INTO user_tags (id, name, color, description, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [tag.id, tag.name, tag.color, tag.description, tag.sortOrder],
  );
}

async function updateUserTagDynamic(tagId, setFragments, values) {
  await db.query(`UPDATE user_tags SET ${setFragments.join(', ')} WHERE id = ?`, [...values, tagId]);
}

async function deleteUserTag(tagId) {
  await db.query('DELETE FROM user_tags WHERE id = ?', [tagId]);
}

async function countUsersByTagId(tagId) {
  const [[row]] = await db.query(
    'SELECT COUNT(DISTINCT user_id) AS total FROM user_tag_assignments WHERE tag_id = ?',
    [tagId],
  );
  return Number(row?.total || 0);
}

async function selectExistingTagIds(tagIds) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) return [];
  const placeholders = tagIds.map(() => '?').join(',');
  const [rows] = await db.query(`SELECT id FROM user_tags WHERE id IN (${placeholders})`, tagIds);
  return rows.map((row) => row.id);
}

async function replaceUserTagAssignments(userId, tagIds) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM user_tag_assignments WHERE user_id = ?', [userId]);
    if (tagIds.length > 0) {
      const values = tagIds.map((tagId) => [userId, tagId]);
      await conn.query('INSERT INTO user_tag_assignments (user_id, tag_id) VALUES ?', [values]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function batchAssignTag(userIds, tagId) {
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    let affected = 0;
    for (const userId of userIds) {
      const [r] = await conn.query(
        'INSERT IGNORE INTO user_tag_assignments (user_id, tag_id) VALUES (?,?)',
        [userId, tagId],
      );
      affected += Number(r?.affectedRows || 0);
    }
    await conn.commit();
    return affected;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateSubordinateEnabled(userId, enabled) {
  await db.query('UPDATE users SET subordinate_enabled = ? WHERE id = ?', [enabled ? 1 : 0, userId]);
}

async function updateUserPasswordHash(userId, passwordHash) {
  await db.query(
    'UPDATE users SET password_hash = ?, refresh_token_version = refresh_token_version + 1 WHERE id = ? AND deleted_at IS NULL',
    [passwordHash, userId],
  );
}

module.exports = {
  getConnection,
  buildUserListWhere,
  countUsers,
  selectUsersPage,
  selectUsersForExport,
  selectTagsForUserIds,
  selectWechatIdentityByUserId,
  deleteWechatIdentityByUserId,
  selectUserSummaryById,
  selectProtectedAdminUserIds,
  countOrdersByUserId,
  sumUserSpentExcludingCancelled,
  updateUserDynamic,
  findPhoneDuplicateByPhones,
  selectUserTags,
  insertUserTag,
  updateUserTagDynamic,
  deleteUserTag,
  countUsersByTagId,
  selectExistingTagIds,
  replaceUserTagAssignments,
  batchAssignTag,
  updateSubordinateEnabled,
  updateUserPasswordHash,
  selectUserSummaryMetrics,
  updateUserStatus,
  upsertUserRestrictions,
  selectUserRestrictions,
  selectLatestStatusAuditLog,
  selectUserDetailRelations,
};



