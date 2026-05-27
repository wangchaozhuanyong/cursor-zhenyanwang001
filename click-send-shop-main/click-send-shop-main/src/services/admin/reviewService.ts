import * as reviewApi from "@/api/admin/review";
import type {
  AdminReview,
  ReviewListParams,
  ReviewDetailPayload,
  ComplaintStatus,
} from "@/api/admin/review";
import { unwrapPaginated } from "@/services/responseNormalize";
import type { PaginatedData } from "@/types/common";

export type { AdminReview, ReviewListParams, ReviewDetailPayload, ComplaintStatus };

export async function fetchReviews(
  params: ReviewListParams,
): Promise<PaginatedData<AdminReview>> {
  const res = await reviewApi.getReviews(params);
  return unwrapPaginated<AdminReview>(res.data);
}

export async function fetchReviewDetail(id: string): Promise<ReviewDetailPayload> {
  const res = await reviewApi.getReviewDetail(id);
  return res.data;
}

export async function toggleVisibility(id: string) {
  await reviewApi.toggleReviewVisibility(id);
}

export async function approveReview(id: string) {
  await reviewApi.approveReview(id);
}

export async function rejectReview(id: string) {
  await reviewApi.rejectReview(id);
}

export async function toggleFeatured(id: string) {
  await reviewApi.toggleReviewFeatured(id);
}

export async function replyReview(id: string, reply: string) {
  await reviewApi.replyReview(id, reply);
}

export async function updateComplaint(
  id: string,
  complaint_status: ComplaintStatus,
  complaint_note?: string,
) {
  await reviewApi.updateReviewComplaint(id, { complaint_status, complaint_note });
}

export async function deleteReview(id: string) {
  await reviewApi.deleteReview(id);
}

export async function restoreReview(id: string) {
  await reviewApi.restoreReview(id);
}

export async function permanentDeleteReview(id: string) {
  await reviewApi.permanentDeleteReview(id);
}

export async function batchHide(ids: string[]) {
  const res = await reviewApi.batchHideReviews(ids);
  return Number((res.data as any)?.affected || 0);
}

export async function batchDelete(ids: string[]) {
  const res = await reviewApi.batchDeleteReviews(ids);
  return Number((res.data as any)?.affected || 0);
}
