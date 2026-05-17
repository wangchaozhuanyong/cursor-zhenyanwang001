const { generateId, verifyToken, parseProductImages } = require('../../utils/helpers');
const { getAccessTokenFromRequest } = require('../../utils/authCookies');
const repo = require('./review.repository');
const moderation = require('./reviewModeration');

function mapPublicReview(r, likedSet) {
  return {
    id: r.id,
    product_id: r.product_id,
    user_id: r.user_id,
    nickname: r.nickname,
    avatar: r.avatar,
    rating: r.rating,
    content: r.content,
    images: parseProductImages(r.images),
    likes_count: r.likes_count || 0,
    liked: likedSet.has(r.id),
    created_at: r.created_at,
    admin_reply: r.admin_reply || null,
    admin_reply_at: r.admin_reply_at || null,
    is_verified_purchase: !!r.is_verified_purchase,
    sku_text: r.sku_text || null,
  };
}

async function getProductReviewStats(productId) {
  return repo.selectProductReviewStats(productId);
}

async function getProductReviews(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const productId = req.params.productId;

  const total = await repo.countReviewsByProduct(productId);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectReviewsPage(productId, pageSize, offset);

  let likedSet = new Set();
  const token = getAccessTokenFromRequest(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      if (typeof payload !== 'string' && payload?.userId) {
        const reviewIds = rows.map((r) => r.id);
        if (reviewIds.length > 0) {
          const likes = await repo.selectLikesForReviews(payload.userId, reviewIds);
          likes.forEach((l) => likedSet.add(l.review_id));
        }
      }
    } catch { /* invalid token */ }
  }

  const list = rows.map((r) => mapPublicReview(r, likedSet));
  return { list, total, page, pageSize };
}

async function toggleLike(userId, reviewId) {
  const review = await repo.selectReviewForLike(reviewId);
  if (!review) {
    return { error: { code: 404, message: '评论不存在或不可点赞' } };
  }

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

function buildSkuText(orderItem) {
  const parts = [];
  if (orderItem.variant_name) parts.push(orderItem.variant_name);
  if (orderItem.sku_code) parts.push(orderItem.sku_code);
  return parts.join(' / ') || orderItem.product_name || '';
}

async function createReview(userId, body) {
  const { product_id, order_item_id, rating, content, images } = body;
  if (!content) return { error: { code: 400, message: '请填写评价内容' } };

  const settings = await moderation.getReviewSettings();
  const initialStatus = moderation.resolveInitialReviewStatus({
    rating: rating || 5,
    images: images || [],
    content,
    settings,
  });
  const complaintStatus = moderation.resolveComplaintStatus(rating || 5);

  const user = await repo.selectUserNicknameAvatar(userId);
  const id = generateId();

  if (order_item_id) {
    const orderItem = await repo.selectOrderItemForReview(userId, order_item_id);
    if (!orderItem) {
      return { error: { code: 400, message: '只能评价已购买并确认收货的订单商品' } };
    }
    const dup = await repo.findReviewByOrderItemId(order_item_id);
    if (dup) return { error: { code: 400, message: '该订单商品已评价过' } };

    await repo.insertReview({
      id,
      productId: orderItem.product_id,
      userId,
      nickname: user?.nickname || '',
      avatar: user?.avatar || '',
      rating: rating || 5,
      content,
      imagesJson: JSON.stringify(images || []),
      status: initialStatus,
      orderId: orderItem.order_id,
      orderItemId: order_item_id,
      variantId: orderItem.variant_id || null,
      skuText: buildSkuText(orderItem),
      isVerifiedPurchase: true,
      complaintStatus,
    });
  } else {
    if (!product_id) return { error: { code: 400, message: '请指定评价商品' } };

    const purchased = await repo.hasCompletedPurchase(userId, product_id);
    if (!purchased) {
      return { error: { code: 400, message: '只能评价已购买并确认收货的商品' } };
    }

    const existingReview = await repo.findUserProductReview(userId, product_id);
    if (existingReview) return { error: { code: 400, message: '您已评价过该商品' } };

    await repo.insertReview({
      id,
      productId: product_id,
      userId,
      nickname: user?.nickname || '',
      avatar: user?.avatar || '',
      rating: rating || 5,
      content,
      imagesJson: JSON.stringify(images || []),
      status: initialStatus,
      isVerifiedPurchase: false,
      complaintStatus,
    });
  }

  const row = await repo.selectReviewById(id);
  row.images = parseProductImages(row.images);
  const msg = initialStatus === 'pending' ? '评价已提交，审核通过后将展示' : '评价成功';
  return { data: row, message: msg };
}

async function getFeaturedReviews(limit = 6) {
  const safeLimit = Math.min(20, Math.max(1, parseInt(String(limit), 10) || 6));
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
    images: parseProductImages(r.images),
    likes_count: r.likes_count || 0,
  }));
  return list;
}

module.exports = {
  getProductReviewStats,
  getProductReviews,
  toggleLike,
  createReview,
  getFeaturedReviews,
};
