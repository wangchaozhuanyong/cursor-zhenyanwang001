import * as feedbackApi from "@/api/admin/feedback";
import { unwrapPaginated } from "@/services/responseNormalize";
import type { PaginatedData } from "@/types/common";

export type {
  AdminFeedback,
  AdminFeedbackListParams,
  AdminFeedbackStatus,
  AdminFeedbackType,
  UpdateAdminFeedbackPayload,
} from "@/api/admin/feedback";

export async function fetchFeedbackList(
  params: feedbackApi.AdminFeedbackListParams,
): Promise<PaginatedData<feedbackApi.AdminFeedback>> {
  const res = await feedbackApi.getFeedbackList(params);
  return unwrapPaginated<feedbackApi.AdminFeedback>(res.data);
}

export async function updateFeedback(
  id: string,
  payload: feedbackApi.UpdateAdminFeedbackPayload,
): Promise<feedbackApi.AdminFeedback> {
  const res = await feedbackApi.updateFeedback(id, payload);
  return res.data;
}
