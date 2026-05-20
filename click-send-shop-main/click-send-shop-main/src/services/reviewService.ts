import * as reviewApi from "@/api/modules/review";
import type { PaginatedData } from "@/types/common";
import type { Review, FeaturedReview, ProductReviewStats, PendingReviewItem, ReviewEligibility } from "@/types/review";
import * as uploadService from "@/services/uploadService";

export async function fetchProductReviewStats(productId: string): Promise<ProductReviewStats> {
  const res = await reviewApi.getProductReviewStats(productId);
  return res.data;
}

export async function fetchProductReviews(productId: string, page = 1) {
  const res = await reviewApi.getProductReviews(productId, page);
  return res.data as PaginatedData<Review>;
}

export async function fetchFeaturedReviews(limit = 6): Promise<FeaturedReview[]> {
  const res = await reviewApi.getFeaturedReviews(limit);
  return Array.isArray(res.data) ? res.data : [];
}

export async function submitReview(params: {
  product_id?: string;
  order_item_id?: string;
  rating: number;
  content: string;
  images?: string[];
}) {
  const res = await reviewApi.createReview(params);
  return res.data;
}

export async function toggleReviewLike(reviewId: string) {
  const res = await reviewApi.toggleReviewLike(reviewId);
  return res.data;
}

export async function uploadReviewImages(files: File[]) {
  return uploadService.uploadFiles(files, { mode: "image" });
}

export async function fetchPendingReviewItems(): Promise<PendingReviewItem[]> {
  const res = await reviewApi.getPendingReviewItems();
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchProductReviewEligibility(productId: string): Promise<ReviewEligibility> {
  const res = await reviewApi.getProductReviewEligibility(productId);
  return res.data;
}
