import * as reviewApi from "@/api/admin/review";
import type { AdminReview, ReviewListParams } from "@/api/admin/review";
import { unwrapPaginated } from "@/services/responseNormalize";
import type { PaginatedData } from "@/types/common";

export type { AdminReview, ReviewListParams };

export async function fetchReviews(
  params: ReviewListParams,
): Promise<PaginatedData<AdminReview>> {
  const res = await reviewApi.getReviews(params);
  return unwrapPaginated<AdminReview>(res.data);
}

export async function toggleVisibility(id: string) {
  await reviewApi.toggleReviewVisibility(id);
}

export async function toggleFeatured(id: string) {
  await reviewApi.toggleReviewFeatured(id);
}

export async function replyReview(id: string, reply: string) {
  await reviewApi.replyReview(id, reply);
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
  await reviewApi.batchHideReviews(ids);
}

export async function batchDelete(ids: string[]) {
  await reviewApi.batchDeleteReviews(ids);
}
