import { Star, ThumbsUp, Camera, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductReviewsViewModel } from "@/hooks/useProductReviews";

interface ProductReviewsProps {
  vm: ProductReviewsViewModel;
}

/** 纯展示：数据与操作来自 ProductDetail → useProductReviews → reviewService */
export default function ProductReviews({ vm }: ProductReviewsProps) {
  const {
    reviews,
    loading,
    showForm,
    setShowForm,
    rating,
    setRating,
    content,
    setContent,
    submitting,
    reviewImages,
    setReviewImages,
    likedIds,
    imgInputRef,
    avgRating,
    handleLike,
    handleImageUpload,
    handleSubmit,
    timeAgo,
  } = vm;

  return (
    <div className="border-t border-border px-4 py-8 md:px-0 md:py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">商品评价</h3>
          <span className="text-xs text-muted-foreground">({reviews.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold active:scale-95 transition-transform"
        >
          写评价
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary p-3 md:p-4">
        <span className="text-3xl font-bold text-gold">{avgRating.toFixed(1)}</span>
        <div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={14} className={s <= Math.round(avgRating) ? "fill-gold text-gold" : "text-border"} />
            ))}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{reviews.length} 条评价</p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-foreground mb-2">您的评分</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setRating(s)} className="touch-target p-0.5">
                    <Star size={24} className={`transition-colors ${s <= rating ? "fill-gold text-gold" : "text-border"}`} />
                  </button>
                ))}
              </div>
              <textarea
                placeholder="分享您的使用体验..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 resize-none"
              />
              {reviewImages.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {reviewImages.map((url, idx) => (
                    <div key={`${idx}-${url.slice(-12)}`} className="relative h-16 w-16">
                      <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => setReviewImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground active:text-foreground"
                >
                  <Camera size={16} /> 添加图片({reviewImages.length}/5)
                </button>
                <input ref={imgInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-full bg-gold px-5 py-2 text-xs font-bold text-primary-foreground active:scale-95 transition-transform disabled:opacity-60"
                >
                  {submitting ? "提交中…" : "提交评价"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">
            暂无评价，快来抢沙发吧！
          </div>
        ) : (
          reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm">
                  {review.avatar || "👤"}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{review.nickname || "用户"}</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={10} className={s <= review.rating ? "fill-gold text-gold" : "text-border"} />
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">{timeAgo(review.created_at)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.content}</p>
              {review.images && review.images.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {review.images.map((img: string, idx: number) => (
                    <img key={idx} src={img} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => handleLike(review.id)}
                className={`mt-2 flex items-center gap-1 text-xs transition-colors ${
                  likedIds.has(review.id) ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <ThumbsUp size={13} className={likedIds.has(review.id) ? "fill-gold" : ""} />
                {review.likes_count || 0}
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
