import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import * as reviewService from "@/services/reviewService";
import type { Review, ProductReviewStats, ReviewEligibility } from "@/types/review";
import { isLoggedIn } from "@/utils/token";

export function timeAgoReview(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "今天";
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return `${Math.floor(days / 30)}个月前`;
}

const DEFAULT_STATS: ProductReviewStats = {
  total: 0,
  avg_rating: 5,
  rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  image_review_count: 0,
};

const DEFAULT_ELIGIBILITY: ReviewEligibility = {
  can_review: false,
  reason: isLoggedIn() ? "purchase_required" : "login_required",
  message: "购买并确认收货后可评价",
  pending_items: [],
  reviewed_count: 0,
};

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ProductReviewStats>(DEFAULT_STATS);
  const [eligibility, setEligibility] = useState<ReviewEligibility>(DEFAULT_ELIGIBILITY);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedOrderItemId, setSelectedOrderItemId] = useState<string>("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const imgInputRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    if (!productId) return;
    const [data, reviewStats, eligibilityData] = await Promise.all([
      reviewService.fetchProductReviews(productId),
      reviewService.fetchProductReviewStats(productId),
      reviewService.fetchProductReviewEligibility(productId),
    ]);
    setReviews(data.list);
    setStats(reviewStats);
    setEligibility(eligibilityData);
    const liked = new Set<string>();
    data.list.forEach((r) => r.liked && liked.add(r.id));
    setLikedIds(liked);
  };

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setReviews([]);
      setStats(DEFAULT_STATS);
      setEligibility(DEFAULT_ELIGIBILITY);
      return;
    }
    let cancelled = false;
    setLoading(true);
    reload().catch(() => {}).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [productId]);

  const handleLike = async (id: string) => {
    try {
      const { liked, likes_count } = await reviewService.toggleReviewLike(id);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.add(id); else next.delete(id);
        return next;
      });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, likes_count, liked } : r)));
    } catch {
      toast.error("请先登录后再点赞");
    }
  };

  const openReview = () => {
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }
    if (!eligibility.can_review) {
      toast.error(eligibility.message || "购买并确认收货后可评价");
      return;
    }
    if (!eligibility.pending_items.length) {
      toast.error("暂无可评价订单");
      return;
    }
    if (eligibility.pending_items.length === 1) {
      setSelectedOrderItemId(eligibility.pending_items[0].order_item_id);
      setShowComposer(true);
      return;
    }
    setShowSelector(true);
  };

  return {
    reviews,
    stats,
    reviewTotal: stats.total,
    loading,
    likedIds,
    imgInputRef,
    avgRating: stats.avg_rating || 5,
    handleLike,
    timeAgo: timeAgoReview,
    eligibility,
    canReview: eligibility.can_review,
    reviewCtaText: !isLoggedIn()
      ? "登录后评价"
      : eligibility.can_review
        ? "写评价"
        : eligibility.reason === "already_reviewed"
          ? "已评价"
          : "购买后评价",
    showComposer,
    setShowComposer,
    showSelector,
    setShowSelector,
    selectedOrderItemId,
    setSelectedOrderItemId,
    openReview,
    reload,
  };
}

export type ProductReviewsViewModel = ReturnType<typeof useProductReviews>;
