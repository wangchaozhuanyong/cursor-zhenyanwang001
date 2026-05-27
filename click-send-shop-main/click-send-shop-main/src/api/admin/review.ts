import { get, put, del, post } from "@/api/request";
import type { PaginatedData } from "@/types/common";

export type ReviewStatus = "pending" | "normal" | "hidden" | "rejected" | "deleted";
export type ComplaintStatus = "none" | "pending" | "in_progress" | "contacted" | "resolved" | "dismissed";

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
  status: ReviewStatus;
  is_featured?: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  product_name: string;
  product_cover: string;
  order_id?: string | null;
  order_item_id?: string | null;
  variant_id?: string | null;
  sku_text?: string | null;
  is_verified_purchase?: boolean;
  complaint_status?: ComplaintStatus;
  complaint_note?: string | null;
  order_no?: string | null;
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
  complaintStatus?: string;
  verifiedOnly?: string;
}

export interface ReviewAuditLog {
  id: string;
  operator_id: string;
  operator_name: string;
  action_type: string;
  summary: string;
  before_json: unknown;
  after_json: unknown;
  result: string;
  created_at: string;
}

export interface ReviewDetailPayload {
  review: AdminReview;
  audit_logs: ReviewAuditLog[];
}

export function getReviews(params: ReviewListParams) {
  return get<PaginatedData<AdminReview>>("/admin/reviews", params as unknown as Record<string, unknown>);
}

export function getReviewDetail(id: string) {
  return get<ReviewDetailPayload>(`/admin/reviews/${id}`);
}

export function toggleReviewVisibility(id: string) {
  return put<void>(`/admin/reviews/${id}/toggle`);
}

export function approveReview(id: string) {
  return put<void>(`/admin/reviews/${id}/approve`);
}

export function rejectReview(id: string) {
  return put<void>(`/admin/reviews/${id}/reject`);
}

export function toggleReviewFeatured(id: string) {
  return put<{ is_featured: boolean } | null>(`/admin/reviews/${id}/feature`);
}

export function replyReview(id: string, reply: string) {
  return put<void>(`/admin/reviews/${id}/reply`, { reply });
}

export function updateReviewComplaint(
  id: string,
  payload: { complaint_status: ComplaintStatus; complaint_note?: string },
) {
  return put<void>(`/admin/reviews/${id}/complaint`, payload);
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
  return post<{ affected: number }>("/admin/reviews/batch-hide", { ids });
}

export function batchDeleteReviews(ids: string[]) {
  return post<{ affected: number }>("/admin/reviews/batch-delete", { ids });
}
