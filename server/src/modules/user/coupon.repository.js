const db = require('../../config/db');

async function countUserCoupons(userId, status) {
  let where = 'WHERE BINARY uc.user_id = BINARY ?';
  const params = [userId];
  if (status) {
    where += ' AND BINARY uc.status = BINARY ?';
    params.push(status);
  }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM user_coupons uc ${where}`, params);
  return total;
}

async function selectUserCouponsPage(userId, status, pageSize, offset) {
  let where = 'WHERE BINARY uc.user_id = BINARY ?';
  const params = [userId];
  if (status) {
    where += ' AND BINARY uc.status = BINARY ?';
    params.push(status);
  }
  const [rows] = await db.query(
    `SELECT uc.id, uc.claimed_at, uc.used_at, uc.status,
            c.id AS coupon_id, c.code, c.title, c.type, c.value,
            c.min_amount, c.start_date, c.end_date, c.status AS coupon_status, c.description,
            c.scope_type, c.display_badge,
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
     JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
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
     WHERE c.status = 'available' AND c.end_date >= CURDATE() AND c.start_date <= CURDATE()
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
       AND c.status = 'available' AND c.end_date >= CURDATE() AND c.start_date <= CURDATE()`,
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

module.exports = {
  countUserCoupons,
  selectUserCouponsPage,
  selectAvailableCoupons,
  selectClaimedCouponIds,
  selectCouponByCodeOrId,
  findUserCoupon,
  insertUserCoupon,
};
