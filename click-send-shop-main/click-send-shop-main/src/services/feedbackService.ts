import * as feedbackApi from "@/api/modules/feedback";
import { unwrapPaginated } from "@/services/responseNormalize";
import type { PaginatedData } from "@/types/common";

export type FeedbackStatus = feedbackApi.FeedbackStatus;
export type FeedbackType = feedbackApi.FeedbackType;
export type MyFeedbackListParams = feedbackApi.MyFeedbackListParams;
export type SubmitFeedbackPayload = feedbackApi.SubmitFeedbackPayload;
export type SubmitFeedbackResult = feedbackApi.SubmitFeedbackResult;
export type UserFeedback = feedbackApi.UserFeedback;

export async function submitFeedback(payload: SubmitFeedbackPayload): Promise<SubmitFeedbackResult> {
  const res = await feedbackApi.submitFeedback(payload);
  return res.data;
}

export async function fetchMyFeedback(
  params: MyFeedbackListParams = {},
): Promise<PaginatedData<UserFeedback>> {
  const res = await feedbackApi.getMyFeedback(params);
  return unwrapPaginated<UserFeedback>(res.data);
}
