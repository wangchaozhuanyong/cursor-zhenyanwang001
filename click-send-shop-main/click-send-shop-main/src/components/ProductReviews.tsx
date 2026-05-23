import { Star, ThumbsUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { ProductReviewsViewModel } from "@/hooks/useProductReviews";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";

interface ProductReviewsProps {
  vm: ProductReviewsViewModel;
}

export default function ProductReviews({ vm }: ProductReviewsProps) {
  const {
    reviews,
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

  return (
    <div className="border-t border-border px-4 py-8 md:px-0 md:py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-foreground">商品评价</h3>
          <span className="text-xs text-muted-foreground">({reviewTotal})</span>
        </div>
        <button type="button" onClick={openReview} className="rounded-full bg-gold/10 px-3 py-1.5 text-xs font-medium text-theme-price">
          {reviewCtaText}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary p-3 md:p-4">
        <span className="text-[26px] font-bold leading-none text-theme-price sm:text-[28px]">{avgRating.toFixed(1)}</span>
        <div>
          <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} className={s <= Math.round(avgRating) ? "fill-theme-price text-theme-price" : "text-border"} />)}</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{reviewTotal} 条评价</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {loading ? <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div> : reviews.length === 0 ? <div className="rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">暂无评价</div> : reviews.map((review, i) => (
          <motion.div key={review.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm">{review.avatar || "👤"}</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">{review.nickname || "用户"}</p>
                <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={10} className={s <= review.rating ? "fill-theme-price text-theme-price" : "text-border"} />)}</div>
              </div>
              <span className="text-[11px] text-muted-foreground">{timeAgo(review.created_at)}</span>
            </div>
            {review.is_verified_purchase && <span className="mt-1 inline-block rounded bg-gold/10 px-1.5 py-0.5 text-[10px] text-theme-price">已购评价</span>}
            <p className="store-body-text mt-2 text-muted-foreground">{review.content}</p>
            <button type="button" onClick={() => handleLike(review.id)} className={`mt-2 flex items-center gap-1 text-xs ${likedIds.has(review.id) ? "text-theme-price" : "text-muted-foreground"}`}>
              <ThumbsUp size={13} className={likedIds.has(review.id) ? "fill-theme-price" : ""} />{review.likes_count || 0}
            </button>
          </motion.div>
        ))}
      </div>

      {showSelector && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowSelector(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-background p-4" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-semibold">选择要评价的订单商品</p>
            <div className="space-y-2">
              {eligibility.pending_items.map((item) => (
                <button
                  key={item.order_item_id}
                  className="w-full rounded-xl border p-3 text-left"
                  onClick={() => {
                    setSelectedOrderItemId(item.order_item_id);
                    setShowSelector(false);
                    setShowComposer(true);
                  }}
                >
                  <p className="text-sm">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{item.variant_name || item.sku_code || "默认规格"} / 订单 {item.order_no}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ReviewComposerSheet open={showComposer} onClose={() => setShowComposer(false)} orderItemId={selectedOrderItemId} onSuccess={() => { void reload(); }} />
    </div>
  );
}
