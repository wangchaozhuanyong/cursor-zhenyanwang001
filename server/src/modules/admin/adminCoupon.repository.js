const db = require('../../config/db');

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
              WHERE cc.coupon_id = c.id
            ) AS category_ids,
            (
              SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
              FROM coupon_categories cc
              JOIN categories cat ON cat.id = cc.category_id
              WHERE cc.coupon_id = c.id
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
  } = params;
  await db.query(
    `INSERT INTO coupons (id, code, title, type, value, min_amount, start_date, end_date, description, scope_type, display_badge)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, code, title, type, value, min_amount, start_date, end_date, description, scope_type || 'all', display_badge || ''],
  );
}

async function selectCouponById(id) {
  const [[row]] = await db.query(
    `SELECT c.*,
            (
              SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
              FROM coupon_categories cc
              WHERE cc.coupon_id = c.id
            ) AS category_ids,
            (
              SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
              FROM coupon_categories cc
              JOIN categories cat ON cat.id = cc.category_id
              WHERE cc.coupon_id = c.id
            ) AS category_names
     FROM coupons c
     WHERE c.id = ?`,
    [id],
  );
  return row || null;
}

async function updateCouponDynamic(setFragments, values, id) {
  await db.query(`UPDATE coupons SET ${setFragments.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteCouponById(id, deletedBy) {
  await db.query('UPDATE coupons SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy || null, id]);
}

async function restoreCouponById(id) {
  await db.query('UPDATE coupons SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
}

async function clearCouponCategories(couponId) {
  await db.query('DELETE FROM coupon_categories WHERE coupon_id = ?', [couponId]);
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
     LEFT JOIN users u ON uc.user_id = u.id
     LEFT JOIN coupons c ON uc.coupon_id = c.id
     ORDER BY uc.claimed_at DESC LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );
  return rows;
}

async function countUserCouponsByCouponId(couponId) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM user_coupons WHERE coupon_id = ?',
    [couponId],
  );
  return total;
}

async function selectCouponRecordsPage(couponId, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT uc.*, u.nickname, u.phone, c.title AS coupon_title
     FROM user_coupons uc
     LEFT JOIN users u ON uc.user_id = u.id
     LEFT JOIN coupons c ON uc.coupon_id = c.id
     WHERE uc.coupon_id = ?
     ORDER BY uc.claimed_at DESC LIMIT ? OFFSET ?`,
    [couponId, pageSize, offset],
  );
  return rows;
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
};
