const db = require('../../../config/db');

async function countCoupons() {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM coupons WHERE deleted_at IS NULL');
  return total;
}

async function selectCouponsPage(pageSize, offset) {
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
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );
  return rows;
}

async function insertCoupon(params) {
  const {
    id, code, title, type, value, min_amount, start_date, end_date, description, scope_type, display_badge,
    total_quantity, per_user_limit, new_user_only, member_only, auto_issue,
    usable_scope_type, usable_product_ids, usable_category_ids, stackable_with_activity,
  } = params;
  await db.query(
    `INSERT INTO coupons
      (id, code, title, type, value, min_amount, start_date, end_date, description, scope_type, display_badge,
       total_quantity, per_user_limit, new_user_only, member_only, auto_issue,
       usable_scope_type, usable_product_ids, usable_category_ids, stackable_with_activity)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, code, title, type, value, min_amount, start_date, end_date, description, scope_type || 'all', display_badge || '',
      Number(total_quantity || 0), Number(per_user_limit || 1), new_user_only ? 1 : 0, member_only ? 1 : 0, auto_issue ? 1 : 0,
      usable_scope_type || 'all',
      usable_product_ids ? JSON.stringify(usable_product_ids) : null,
      usable_category_ids ? JSON.stringify(usable_category_ids) : null,
      stackable_with_activity === false ? 0 : 1,
    ],
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

async function countAllUserCoupons() {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM user_coupons');
  return total;
}

async function selectAllCouponRecordsPage(pageSize, offset) {
  const [rows] = await db.query(
    `SELECT uc.*, u.nickname, u.phone, c.title AS coupon_title
     FROM user_coupons uc
     LEFT JOIN users u ON BINARY uc.user_id = BINARY u.id
     LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
     ORDER BY uc.claimed_at DESC LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );
  return rows;
}

async function countUserCouponsByCouponId(couponId) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM user_coupons WHERE BINARY coupon_id = BINARY ?',
    [couponId],
  );
  return total;
}

async function selectCouponRecordsPage(couponId, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT uc.*, u.nickname, u.phone, c.title AS coupon_title
     FROM user_coupons uc
     LEFT JOIN users u ON BINARY uc.user_id = BINARY u.id
     LEFT JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
     WHERE BINARY uc.coupon_id = BINARY ?
     ORDER BY uc.claimed_at DESC LIMIT ? OFFSET ?`,
    [couponId, pageSize, offset],
  );
  return rows;
}

async function selectCouponBaseById(couponId) {
  const [[row]] = await db.query(
    `SELECT id, title, code, status, start_date, end_date, deleted_at
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

async function batchIssueCouponToUsers(couponId, userIds, genId) {
  if (!Array.isArray(userIds) || !userIds.length) return 0;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let affected = 0;
    for (const userId of userIds) {
      const [exists] = await conn.query(
        'SELECT id FROM user_coupons WHERE BINARY user_id = BINARY ? AND BINARY coupon_id = BINARY ? LIMIT 1',
        [userId, couponId],
      );
      if (Array.isArray(exists) && exists.length) continue;
      const [r] = await conn.query(
        'INSERT INTO user_coupons (id, user_id, coupon_id, claimed_at, status) VALUES (?,?,?,NOW(),?)',
        [genId(), userId, couponId, 'available'],
      );
      affected += Number(r?.affectedRows || 0);
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
  selectCouponRecordsPage,
  selectCouponBaseById,
  selectUserIdsByTagIds,
  batchIssueCouponToUsers,
};



