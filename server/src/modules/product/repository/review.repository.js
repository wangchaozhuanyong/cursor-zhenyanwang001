const db = require('../../../config/db');
const { ORDER_STATUS } = require('../../../constants/status');

/** 鍓嶅彴鍙锛氫粎 normal锛堝吋瀹瑰巻鍙?NULL锛?*/
const PUBLIC_VISIBLE_WHERE = "(status = 'normal' OR status IS NULL)";

async function ensureReviewSchema() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS review_likes (
      id VARCHAR(32) PRIMARY KEY,
      review_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_review_user (review_id, user_id)
    )`);
    const [[column]] = await db.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'product_reviews'
         AND COLUMN_NAME = 'likes_count'
       LIMIT 1`,
    );
    if (!column) {
      await db.query('ALTER TABLE product_reviews ADD COLUMN likes_count INT NOT NULL DEFAULT 0');
    }
  } catch (e) {
    // Schema compatibility should not block the public review/product pages.
  }
}

(async () => {
  await ensureReviewSchema();
})();

async function countReviewsByProduct(productId) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM product_reviews
     WHERE product_id = ? AND ${PUBLIC_VISIBLE_WHERE}`,
    [productId],
  );
  return total;
}

async function selectProductReviewStats(productId) {
  const [[row]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       COALESCE(AVG(rating), 0) AS avg_rating,
       SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS r1,
       SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS r2,
       SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS r3,
       SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS r4,
       SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS r5,
       SUM(CASE WHEN images IS NOT NULL AND images != '' AND images != '[]' THEN 1 ELSE 0 END) AS image_review_count
     FROM product_reviews
     WHERE product_id = ? AND ${PUBLIC_VISIBLE_WHERE}`,
    [productId],
  );
  return {
    total: Number(row?.total || 0),
    avg_rating: Number(row?.avg_rating || 0),
    rating_distribution: {
      1: Number(row?.r1 || 0),
      2: Number(row?.r2 || 0),
      3: Number(row?.r3 || 0),
      4: Number(row?.r4 || 0),
      5: Number(row?.r5 || 0),
    },
    image_review_count: Number(row?.image_review_count || 0),
  };
}

async function selectReviewsPage(productId, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT id, product_id, user_id, nickname, avatar, rating, content, images,
            likes_count, created_at, admin_reply, admin_reply_at,
            is_verified_purchase, sku_text
     FROM product_reviews
     WHERE product_id = ? AND ${PUBLIC_VISIBLE_WHERE}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [productId, pageSize, offset],
  );
  return rows;
}

async function selectReviewForLike(reviewId) {
  const [[row]] = await db.query(
    `SELECT id, status FROM product_reviews WHERE id = ? LIMIT 1`,
    [reviewId],
  );
  if (!row) return null;
  const status = row.status || 'normal';
  if (status !== 'normal') return null;
  return row;
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

async function selectOrderItemForReview(userId, orderItemId) {
  const [[row]] = await db.query(
    `SELECT oi.id AS order_item_id, oi.order_id, oi.product_id, oi.variant_id,
            oi.sku_code, oi.variant_name, oi.product_name,
            o.status AS order_status, o.user_id
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.id = ? AND o.user_id = ?
     LIMIT 1`,
    [orderItemId, userId],
  );
  if (!row || row.order_status !== ORDER_STATUS.COMPLETED) return null;
  return row;
}

async function selectPendingReviewItems(userId) {
  const [rows] = await db.query(
    `SELECT
       o.id AS order_id,
       o.order_no,
       oi.id AS order_item_id,
       oi.product_id,
       oi.product_name,
       oi.product_image,
       oi.variant_id,
       oi.variant_name,
       oi.sku_code,
       oi.qty,
       o.updated_at,
       o.created_at,
       o.completed_at
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN product_reviews pr ON pr.order_item_id = oi.id
     WHERE o.user_id = ?
       AND o.status = ?
       AND pr.id IS NULL
     ORDER BY COALESCE(o.updated_at, o.created_at) DESC, o.created_at DESC`,
    [userId, ORDER_STATUS.COMPLETED],
  );
  return rows;
}

async function selectPendingReviewItemsByProduct(userId, productId) {
  const [rows] = await db.query(
    `SELECT
       o.id AS order_id,
       o.order_no,
       oi.id AS order_item_id,
       oi.product_id,
       oi.product_name,
       oi.product_image,
       oi.variant_id,
       oi.variant_name,
       oi.sku_code,
       oi.qty,
       o.updated_at,
       o.created_at,
       o.completed_at
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN product_reviews pr ON pr.order_item_id = oi.id
     WHERE o.user_id = ?
       AND oi.product_id = ?
       AND o.status = ?
       AND pr.id IS NULL
     ORDER BY COALESCE(o.updated_at, o.created_at) DESC, o.created_at DESC`,
    [userId, productId, ORDER_STATUS.COMPLETED],
  );
  return rows;
}

async function countReviewedProductItems(userId, productId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS reviewed_count
     FROM product_reviews r
     JOIN orders o ON o.id = r.order_id
     WHERE r.user_id = ? AND r.product_id = ? AND o.user_id = ?`,
    [userId, productId, userId],
  );
  return Number(row?.reviewed_count || 0);
}

async function findReviewByOrderItemId(orderItemId) {
  const [[row]] = await db.query(
    'SELECT id FROM product_reviews WHERE order_item_id = ? LIMIT 1',
    [orderItemId],
  );
  return row || null;
}

async function findUserProductReview(userId, productId) {
  const [[row]] = await db.query(
    `SELECT id FROM product_reviews
     WHERE user_id = ? AND product_id = ? AND order_item_id IS NULL
     LIMIT 1`,
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
    status, orderId, orderItemId, variantId, skuText, isVerifiedPurchase, complaintStatus,
  } = params;
  await db.query(
    `INSERT INTO product_reviews (
      id, product_id, user_id, nickname, avatar, rating, content, images, status,
      order_id, order_item_id, variant_id, sku_text, is_verified_purchase, complaint_status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, productId, userId, nickname, avatar, rating, content, imagesJson, status,
      orderId || null, orderItemId || null, variantId || null, skuText || null,
      isVerifiedPurchase ? 1 : 0, complaintStatus || 'none',
    ],
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
     WHERE r.is_featured = 1 AND ${PUBLIC_VISIBLE_WHERE.replace(/status/g, 'r.status')}
     ORDER BY r.created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function selectAutoFeaturedReviews(limit) {
  const [rows] = await db.query(
    `SELECT r.id, r.product_id, r.user_id, r.nickname, r.avatar,
            r.rating, r.content, r.images, r.likes_count, r.created_at,
            p.name AS product_name, p.cover_image AS product_cover
     FROM product_reviews r
     LEFT JOIN products p ON p.id = r.product_id
     WHERE ${PUBLIC_VISIBLE_WHERE.replace(/status/g, 'r.status')}
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
  PUBLIC_VISIBLE_WHERE,
  countReviewsByProduct,
  selectProductReviewStats,
  selectReviewsPage,
  selectReviewForLike,
  selectLikesForReviews,
  findLike,
  deleteLikeById,
  decrementLikesCount,
  selectLikesCount,
  insertLike,
  incrementLikesCount,
  hasCompletedPurchase,
  selectOrderItemForReview,
  selectPendingReviewItems,
  selectPendingReviewItemsByProduct,
  countReviewedProductItems,
  findReviewByOrderItemId,
  findUserProductReview,
  selectUserNicknameAvatar,
  insertReview,
  selectReviewById,
  selectFeaturedReviews,
  selectAutoFeaturedReviews,
};



