import { get, post } from "@/api/request";
import type { PaginatedData } from "@/types/common";
import type { Review, FeaturedReview, ProductReviewStats } from "@/types/review";
export type { Review, FeaturedReview, ProductReviewStats };

export function getProductReviewStats(productId: string) {
  return get<ProductReviewStats>(`/reviews/product/${productId}/stats`);
}

export function getProductReviews(productId: string, page = 1) {
  return get<PaginatedData<Review>>(`/reviews/product/${productId}`, {
    page: String(page),
  });
}

export function getFeaturedReviews(limit = 6) {
  return get<FeaturedReview[]>("/reviews/featured", { limit: String(limit) });
}

export function createReview(params: {
  product_id?: string;
  order_item_id?: string;
  rating: number;
  content: string;
  images?: string[];
}) {
  return post<Review>("/reviews", params);
}

export function toggleReviewLike(reviewId: string) {
  return post<{ liked: boolean; likes_count: number }>(`/reviews/${reviewId}/like`);
}
