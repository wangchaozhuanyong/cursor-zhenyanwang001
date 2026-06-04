import { get, post } from "@/api/request";
import type { PaginatedData } from "@/types/common";

export type FeedbackType = "suggestion" | "bug" | "order" | "payment" | "account" | "other";
export type FeedbackStatus = "pending" | "in_progress" | "resolved" | "dismissed";

export interface SubmitFeedbackPayload {
  type: FeedbackType;
  title?: string;
  content: string;
  contact?: string;
  orderNo?: string;
  pageUrl?: string;
}

export interface SubmitFeedbackResult {
  id: string;
  status: FeedbackStatus;
}

export interface UserFeedback {
  id: string;
  user_id: string;
  type: FeedbackType;
  title: string;
  content: string;
  contact: string;
  order_no: string;
  page_url: string;
  status: FeedbackStatus;
  handler_note: string;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyFeedbackListParams {
  page?: number;
  pageSize?: number;
}

export function submitFeedback(payload: SubmitFeedbackPayload) {
  return post<SubmitFeedbackResult>("/feedback", payload);
}

export function getMyFeedback(params: MyFeedbackListParams = {}) {
  return get<PaginatedData<UserFeedback>>("/feedback/my", params as Record<string, unknown>);
}
