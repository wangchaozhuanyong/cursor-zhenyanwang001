const db = require('../../config/db');
const { ORDER_STATUS } = require('../../constants/status');

async function ensureReviewSchema() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS review_likes (
      id VARCHAR(32) PRIMARY KEY,
      review_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_review_user (review_id, user_id)
    )`);
    await db.query(`ALTER TABLE product_reviews ADD COLUMN likes_count INT NOT NULL DEFAULT 0`);
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') { /* ignore */ }
  }
}

(async () => {
  await ensureReviewSchema();
})();

async function countReviewsByProduct(productId) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM product_reviews WHERE product_id = ?',
    [productId],
  );
  return total;
}

async function selectReviewsPage(productId, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT * FROM product_reviews WHERE product_id = ?
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [productId, pageSize, offset],
  );
  return rows;
}

async function selectLikesForReviews(userId, reviewIds) {
  if (!reviewIds.length) return [];
  const [likes] = await db.query(
    `SELECT review_id FROM review_likes WHERE user_id = ? AND review_id IN (${reviewIds.map(() => '?').join(',')})`,
    [userId, ...reviewIds],
  );
  return likes;
}

async function findLike(reviewId, userId) {
  const [[row]] = await db.query(
    'SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?',
    [reviewId, userId],
  );
  return row || null;
}

async function deleteLikeById(likeId) {
  await db.query('DELETE FROM review_likes WHERE id = ?', [likeId]);
}

async function decrementLikesCount(reviewId) {
  await db.query(
    'UPDATE product_reviews SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?',
    [reviewId],
  );
}

async function selectLikesCount(reviewId) {
  const [[row]] = await db.query('SELECT likes_count FROM product_reviews WHERE id = ?', [reviewId]);
  return row?.likes_count ?? 0;
}

async function insertLike(id, reviewId, userId) {
  await db.query(
    'INSERT INTO review_likes (id, review_id, user_id) VALUES (?,?,?)',
    [id, reviewId, userId],
  );
}

async function incrementLikesCount(reviewId) {
  await db.query('UPDATE product_reviews SET likes_count = likes_count + 1 WHERE id = ?', [reviewId]);
}

async function hasCompletedPurchase(userId, productId) {
  const [[purchased]] = await db.query(
    `SELECT 1 FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ? AND oi.product_id = ? AND o.status = ? LIMIT 1`,
    [userId, productId, ORDER_STATUS.COMPLETED],
  );
  return !!purchased;
}

async function findUserProductReview(userId, productId) {
  const [[row]] = await db.query(
    'SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ? LIMIT 1',
    [userId, productId],
  );
  return row || null;
}

async function selectUserNicknameAvatar(userId) {
  const [[row]] = await db.query(
    'SELECT nickname, avatar FROM users WHERE id = ?',
    [userId],
  );
  return row || null;
}

async function insertReview(params) {
  const {
    id, productId, userId, nickname, avatar, rating, content, imagesJson,
  } = params;
  await db.query(
    `INSERT INTO product_reviews (id, product_id, user_id, nickname, avatar, rating, content, images)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, productId, userId, nickname, avatar, rating, content, imagesJson],
  );
}

async function selectReviewById(id) {
  const [[row]] = await db.query('SELECT * FROM product_reviews WHERE id = ?', [id]);
  return row || null;
}

async function selectFeaturedReviews(limit) {
  const [rows] = await db.query(
    `SELECT r.id, r.product_id, r.user_id, r.nickname, r.avatar,
            r.rating, r.content, r.images, r.likes_count, r.created_at,
            p.name AS product_name, p.cover_image AS product_cover
     FROM product_reviews r
     LEFT JOIN products p ON p.id = r.product_id
     WHERE r.is_featured = 1
       AND (r.status IS NULL OR r.status = 'normal')
     ORDER BY r.created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

/**
 * 当 is_featured 不足时退化为按高分 + 较多点赞 + 内容长度的"自动精选"
 */
async function selectAutoFeaturedReviews(limit) {
  const [rows] = await db.query(
    `SELECT r.id, r.product_id, r.user_id, r.nickname, r.avatar,
            r.rating, r.content, r.images, r.likes_count, r.created_at,
            p.name AS product_name, p.cover_image AS product_cover
     FROM product_reviews r
     LEFT JOIN products p ON p.id = r.product_id
     WHERE (r.status IS NULL OR r.status = 'normal')
       AND r.rating >= 4
       AND CHAR_LENGTH(r.content) >= 12
     ORDER BY r.likes_count DESC, r.rating DESC, r.created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

module.exports = {
  ensureReviewSchema,
  countReviewsByProduct,
  selectReviewsPage,
  selectLikesForReviews,
  findLike,
  deleteLikeById,
  decrementLikesCount,
  selectLikesCount,
  insertLike,
  incrementLikesCount,
  hasCompletedPurchase,
  findUserProductReview,
  selectUserNicknameAvatar,
  insertReview,
  selectReviewById,
  selectFeaturedReviews,
  selectAutoFeaturedReviews,
};
