import { get, put, del, post } from "../request";
import type { PaginatedData } from "@/types/common";

export interface AdminReview {
  id: string;
  product_id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  rating: number;
  content: string;
  images: string[];
  likes_count: number;
  status: "normal" | "hidden" | "deleted";
  is_featured?: boolean | number;
  admin_reply: string | null;
  admin_reply_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  product_name: string;
  product_cover: string;
}

export interface ReviewListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  rating?: number;
  productId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  includeDeleted?: string;
}

export function getReviews(params: ReviewListParams) {
  return get<PaginatedData<AdminReview>>("/admin/reviews", params as Record<string, unknown>);
}

export function toggleReviewVisibility(id: string) {
  return put<void>(`/admin/reviews/${id}/toggle`);
}

export function toggleReviewFeatured(id: string) {
  return put<{ is_featured: boolean } | null>(`/admin/reviews/${id}/feature`);
}

export function replyReview(id: string, reply: string) {
  return put<void>(`/admin/reviews/${id}/reply`, { reply });
}

export function deleteReview(id: string) {
  return del<void>(`/admin/reviews/${id}`);
}

export function restoreReview(id: string) {
  return put<void>(`/admin/reviews/${id}/restore`);
}

export function permanentDeleteReview(id: string) {
  return del<void>(`/admin/reviews/${id}/permanent`);
}

export function batchHideReviews(ids: string[]) {
  return post<void>("/admin/reviews/batch-hide", { ids });
}

export function batchDeleteReviews(ids: string[]) {
  return post<void>("/admin/reviews/batch-delete", { ids });
}
