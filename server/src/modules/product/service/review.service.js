const { generateId, verifyToken, parseProductImages } = require('../../../utils/helpers');
const { getAccessTokenFromRequest } = require('../../../utils/authCookies');
const repo = require('../repository/review.repository');
const moderation = require('../reviewModeration');

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
    return { error: { code: 404, message: '评论不存在或不可删除' } };
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

function mapPendingItem(row) {
  return {
    order_id: row.order_id,
    order_no: row.order_no,
    order_item_id: row.order_item_id,
    product_id: row.product_id,
    product_name: row.product_name,
    product_image: row.product_image,
    variant_id: row.variant_id || null,
    variant_name: row.variant_name || '',
    sku_code: row.sku_code || '',
    qty: Number(row.qty || 0),
    completed_at: row.completed_at || row.updated_at || row.created_at,
  };
}

async function createReview(userId, body) {
  const { product_id, order_item_id, rating, content, images } = body;
  if (!content) return { error: { code: 400, message: '请填写评论内容' } };

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
    if (dup) return { error: { code: 400, message: '该订单商品已经评价过' } };

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
    const pendingItems = await repo.selectPendingReviewItemsByProduct(userId, product_id);
    const candidate = pendingItems[0];
    if (!candidate) {
      return { error: { code: 400, message: '该商品暂无可评价订单' } };
    }

    await repo.insertReview({
      id,
      productId: candidate.product_id,
      userId,
      nickname: user?.nickname || '',
      avatar: user?.avatar || '',
      rating: rating || 5,
      content,
      imagesJson: JSON.stringify(images || []),
      status: initialStatus,
      orderId: candidate.order_id,
      orderItemId: candidate.order_item_id,
      variantId: candidate.variant_id || null,
      skuText: buildSkuText(candidate),
      isVerifiedPurchase: true,
      complaintStatus,
    });
  }

  const row = await repo.selectReviewById(id);
  row.images = parseProductImages(row.images);
  const msg = initialStatus === 'pending' ? '评论已提交，审核通过后展示' : '评论成功';
  return { data: row, message: msg };
}

async function getPendingReviewItems(userId) {
  const rows = await repo.selectPendingReviewItems(userId);
  return rows.map(mapPendingItem);
}

async function getProductReviewEligibility(productId, userId) {
  if (!userId) {
    return {
      can_review: false,
      reason: 'login_required',
      message: '请先登录后操作',
      pending_items: [],
      reviewed_count: 0,
    };
  }

  const pendingRows = await repo.selectPendingReviewItemsByProduct(userId, productId);
  if (pendingRows.length > 0) {
    return {
      can_review: true,
      reason: '',
      message: '无权限',
      pending_items: pendingRows.map(mapPendingItem),
      reviewed_count: await repo.countReviewedProductItems(userId, productId),
    };
  }

  const reviewedCount = await repo.countReviewedProductItems(userId, productId);
  if (reviewedCount > 0) {
    return {
      can_review: false,
      reason: 'already_reviewed',
      message: '请勿重复评价该商品',
      pending_items: [],
      reviewed_count: reviewedCount,
    };
  }

  return {
    can_review: false,
    reason: 'purchase_required',
    message: '请确认收货后再评价',
    pending_items: [],
    reviewed_count: 0,
  };
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
  getPendingReviewItems,
  getProductReviewEligibility,
  getFeaturedReviews,
};


