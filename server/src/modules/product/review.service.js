const { generateId, verifyToken } = require('../../utils/helpers');
const repo = require('./review.repository');

async function getProductReviews(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const productId = req.params.productId;

  const total = await repo.countReviewsByProduct(productId);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectReviewsPage(productId, pageSize, offset);

  let likedSet = new Set();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (payload?.userId) {
        const reviewIds = rows.map((r) => r.id);
        if (reviewIds.length > 0) {
          const likes = await repo.selectLikesForReviews(payload.userId, reviewIds);
          likes.forEach((l) => likedSet.add(l.review_id));
        }
      }
    } catch { /* invalid token */ }
  }

  const list = rows.map((r) => ({
    ...r,
    images: typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []),
    likes_count: r.likes_count || 0,
    liked: likedSet.has(r.id),
  }));

  return { list, total, page, pageSize };
}

async function toggleLike(userId, reviewId) {
  const existing = await repo.findLike(reviewId, userId);
  if (existing) {
    await repo.deleteLikeById(existing.id);
    await repo.decrementLikesCount(reviewId);
    const likes_count = await repo.selectLikesCount(reviewId);
    return { liked: false, likes_count };
  }

  const id = generateId();
  await repo.insertLike(id, reviewId, userId);
  await repo.incrementLikesCount(reviewId);
  const likes_count = await repo.selectLikesCount(reviewId);
  return { liked: true, likes_count };
}

async function createReview(userId, body) {
  const { product_id, rating, content, images } = body;
  if (!product_id || !content) return { error: { code: 400, message: '请填写评价内容' } };

  const purchased = await repo.hasCompletedPurchase(userId, product_id);
  if (!purchased) return { error: { code: 400, message: '只能评价已购买并确认收货的商品' } };

  const existingReview = await repo.findUserProductReview(userId, product_id);
  if (existingReview) return { error: { code: 400, message: '您已评价过该商品' } };

  const user = await repo.selectUserNicknameAvatar(userId);
  const id = generateId();
  await repo.insertReview({
    id,
    productId: product_id,
    userId,
    nickname: user?.nickname || '',
    avatar: user?.avatar || '',
    rating: rating || 5,
    content,
    imagesJson: JSON.stringify(images || []),
  });

  const row = await repo.selectReviewById(id);
  row.images = typeof row.images === 'string' ? JSON.parse(row.images || '[]') : (row.images || []);
  return { data: row, message: '评价成功' };
}

/**
 * 首页"用户口碑"精选评价聚合
 *  - 优先返回 is_featured=1 的评论
 *  - 不足则按 rating>=4 / 内容>=12字 / 点赞数 自动补齐
 *  - 与商品 join，便于前端跳转商品详情
 */
async function getFeaturedReviews(limit = 6) {
  const safeLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 6));
  const featured = await repo.selectFeaturedReviews(safeLimit);
  let list = featured;
  if (list.length < safeLimit) {
    const extra = await repo.selectAutoFeaturedReviews(safeLimit);
    const seen = new Set(list.map((r) => r.id));
    for (const r of extra) {
      if (list.length >= safeLimit) break;
      if (!seen.has(r.id)) list.push(r);
    }
  }
  list = list.slice(0, safeLimit).map((r) => ({
    ...r,
    images: typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []),
    likes_count: r.likes_count || 0,
  }));
  return list;
}

module.exports = {
  getProductReviews,
  toggleLike,
  createReview,
  getFeaturedReviews,
};
