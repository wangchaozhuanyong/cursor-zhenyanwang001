import { CheckCircle2, ImageIcon, Loader2, MessageSquareText, PenLine, ShieldCheck, Star, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import type { ProductReviewsViewModel } from "@/hooks/useProductReviews";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";
import { AppModal } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StableImage from "@/components/ui/StableImage";

interface ProductReviewsProps {
  vm: ProductReviewsViewModel;
}

export default function ProductReviews({ vm }: ProductReviewsProps) {
  const {
    reviews,
    stats,
    loading,
    likedIds,
    avgRating,
    reviewTotal,
    handleLike,
    timeAgo,
    reviewCtaText,
    openReview,
    showComposer,
    setShowComposer,
    selectedOrderItemId,
    eligibility,
    showSelector,
    setShowSelector,
    setSelectedOrderItemId,
    reload,
  } = vm;

  const selectedPendingItem = eligibility.pending_items.find((item) => item.order_item_id === selectedOrderItemId);
  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = Number(stats.rating_distribution?.[rating as 1 | 2 | 3 | 4 | 5] || 0);
    const percent = reviewTotal > 0 ? Math.round((count / reviewTotal) * 100) : 0;
    return { rating, count, percent };
  });
  const imageReviewCount = Number(stats.image_review_count || 0);
  const reviewActionHint = !eligibility.can_review
    ? eligibility.message || "购买并确认收货后可评价"
    : eligibility.pending_items.length > 1
      ? `有 ${eligibility.pending_items.length} 件商品可评价`
      : "分享真实购买体验";

  return (
    <section className="store-product-v12-reviews" aria-label="商品评价">
      <div className="store-product-v12-reviews__head">
        <div>
          <span>
            <MessageSquareText size={15} aria-hidden />
            商品评价
          </span>
          <h2>真实购买反馈</h2>
          <p>{reviewActionHint}</p>
        </div>
        <UnifiedButton type="button" onClick={openReview} className="store-product-v12-reviews__write">
          <PenLine size={14} aria-hidden />
          {reviewCtaText}
        </UnifiedButton>
      </div>

      <div className="store-product-v12-reviews__summary">
        <div className="store-product-v12-reviews__score">
          <strong>{avgRating.toFixed(1)}</strong>
          <div>
            <RatingStars rating={Math.round(avgRating)} size={15} />
            <p>{reviewTotal} 条评价 · {imageReviewCount} 条带图</p>
          </div>
        </div>
        <div className="store-product-v12-reviews__distribution" aria-label="评分分布">
          {distribution.map((item) => (
            <div key={item.rating}>
              <span>{item.rating} 星</span>
              <b aria-hidden><i style={{ width: `${item.percent}%` }} /></b>
              <em>{item.count}</em>
            </div>
          ))}
        </div>
        <div className="store-product-v12-reviews__guard">
          <ShieldCheck size={16} aria-hidden />
          <p>评价资格来自订单状态，只有确认收货后的商品才允许提交评价。</p>
        </div>
      </div>

      <div className="store-product-v12-reviews__list">
        {loading ? (
          <div className="store-product-v12-reviews__loading">
            <Loader2 size={18} className="animate-spin" />
            正在同步评价
          </div>
        ) : reviews.length === 0 ? (
          <div className="store-product-v12-reviews__empty">
            <MessageSquareText size={22} aria-hidden />
            <strong>暂无评价</strong>
            <p>确认收货后的真实反馈会展示在这里。</p>
          </div>
        ) : reviews.map((review, i) => (
          <motion.article
            key={review.id}
            className="store-product-v12-review-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="store-product-v12-review-card__head">
              <ReviewAvatar avatar={review.avatar} nickname={review.nickname} />
              <div>
                <p>{review.nickname || "用户"}</p>
                <RatingStars rating={review.rating} size={11} />
              </div>
              <time>{timeAgo(review.created_at)}</time>
            </div>
            <div className="store-product-v12-review-card__meta">
              {review.is_verified_purchase ? (
                <span>
                  <CheckCircle2 size={12} aria-hidden />
                  已购评价
                </span>
              ) : null}
              {review.sku_text ? <span>{review.sku_text}</span> : null}
              {review.images?.length ? (
                <span>
                  <ImageIcon size={12} aria-hidden />
                  {review.images.length} 图
                </span>
              ) : null}
            </div>
            <p className="store-product-v12-review-card__content">{review.content}</p>
            {review.images?.length ? (
              <div className="store-product-v12-review-card__images">
                {review.images.slice(0, 4).map((url) => (
                  <StableImage key={url} src={url} alt={`${review.nickname || "用户"} 的评价图片`} />
                ))}
              </div>
            ) : null}
            {review.admin_reply ? (
              <div className="store-product-v12-review-card__reply">
                <strong>商家回复</strong>
                <p>{review.admin_reply}</p>
              </div>
            ) : null}
            <UnifiedButton
              type="button"
              onClick={() => handleLike(review.id)}
              className={`store-product-v12-review-card__like ${likedIds.has(review.id) ? "is-liked" : ""}`}
            >
              <ThumbsUp size={13} className={likedIds.has(review.id) ? "fill-theme-price" : ""} />
              {review.likes_count || 0}
            </UnifiedButton>
          </motion.article>
        ))}
      </div>

      <AppModal
        tier="standard"
        open={showSelector}
        onClose={() => setShowSelector(false)}
        title="选择要评价的商品"
        height="auto"
      >
        <div className="space-y-2 pb-2">
          {eligibility.pending_items.map((item) => (
            <UnifiedButton
              key={item.order_item_id}
              type="button"
              className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-left transition hover:bg-[var(--theme-bg)]"
              onClick={() => {
                setSelectedOrderItemId(item.order_item_id);
                setShowSelector(false);
                setShowComposer(true);
              }}
            >
              <p className="text-sm font-medium text-[var(--theme-text)]">{item.product_name}</p>
              <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                {item.variant_name || item.sku_code || "默认规格"} · 订单 {item.order_no}
              </p>
            </UnifiedButton>
          ))}
        </div>
      </AppModal>

      <ReviewComposerSheet
        open={showComposer}
        onClose={() => setShowComposer(false)}
        orderItemId={selectedOrderItemId}
        product={selectedPendingItem ? { name: selectedPendingItem.product_name } : undefined}
        variantName={selectedPendingItem?.variant_name || selectedPendingItem?.sku_code || undefined}
        onSuccess={() => {
          void reload();
        }}
      />
    </section>
  );
}

function RatingStars({ rating, size }: { rating: number; size: number }) {
  return (
    <div className="store-product-v12-stars" aria-label={`${rating} 星`}>
      {[1, 2, 3, 4, 5].map((score) => (
        <Star
          key={score}
          size={size}
          className={score <= rating ? "fill-theme-price text-theme-price" : "text-border"}
        />
      ))}
    </div>
  );
}

function ReviewAvatar({ avatar, nickname }: { avatar?: string | null; nickname?: string | null }) {
  const displayName = nickname?.trim() || "用户";
  const initial = displayName.slice(0, 1).toUpperCase();
  if (avatar && /^https?:\/\//i.test(avatar)) {
    return (
      <span className="store-product-v12-review-card__avatar">
        <img src={avatar} alt={`${displayName} 头像`} loading="lazy" />
      </span>
    );
  }
  return <span className="store-product-v12-review-card__avatar">{initial}</span>;
}
