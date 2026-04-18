import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import * as reviewService from "@/services/reviewService";
import type { Review } from "@/types/review";

export function timeAgoReview(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "今天";
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return `${Math.floor(days / 30)}个月前`;
}

/** 商品评价：由 ProductDetail 调用 → reviewService → API */
export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const imgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setReviews([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    reviewService
      .fetchProductReviews(productId)
      .then((data) => {
        if (cancelled) return;
        setReviews(data.list);
        const liked = new Set<string>();
        data.list.forEach((r) => {
          if (r.liked) liked.add(r.id);
        });
        setLikedIds(liked);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 5;

  const handleLike = async (id: string) => {
    try {
      const { liked, likes_count } = await reviewService.toggleReviewLike(id);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.add(id);
        else next.delete(id);
        return next;
      });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, likes_count, liked } : r)));
    } catch {
      toast.error("请先登录后再点赞");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (reviewImages.length + files.length > 5) {
      toast.error("最多上传5张图片");
      return;
    }
    try {
      const uploaded = await reviewService.uploadReviewImages(files);
      setReviewImages((prev) => [...prev, ...uploaded.map((u) => u.url)]);
    } catch {
      toast.error("图片上传失败");
    }
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!productId) return;
    if (rating === 0) {
      toast.error("请选择评分");
      return;
    }
    if (!content.trim()) {
      toast.error("请填写评价内容");
      return;
    }
    setSubmitting(true);
    try {
      const created = await reviewService.submitReview({
        product_id: productId,
        rating,
        content,
        images: reviewImages,
      });
      setReviews((prev) => [created, ...prev]);
      toast.success("评价提交成功！");
      setShowForm(false);
      setRating(0);
      setContent("");
      setReviewImages([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return {
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
    timeAgo: timeAgoReview,
  };
}

export type ProductReviewsViewModel = ReturnType<typeof useProductReviews>;
