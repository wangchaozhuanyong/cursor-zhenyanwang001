import { get, patch } from "@/api/request";
import type { PaginatedData } from "@/types/common";

export type AdminFeedbackType = "suggestion" | "bug" | "order" | "payment" | "account" | "other";
export type AdminFeedbackStatus = "pending" | "in_progress" | "resolved" | "dismissed";

export interface AdminFeedback {
  id: string;
  user_id: string | null;
  type: AdminFeedbackType;
  title: string;
  content: string;
  contact: string;
  order_no: string;
  page_url: string;
  status: AdminFeedbackStatus;
  handler_note: string;
  handled_by: string | null;
  handled_at: string | null;
  source_ip: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
  user_nickname: string;
  user_phone: string;
  handler_name: string;
}

export interface AdminFeedbackListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: "all" | AdminFeedbackStatus;
  type?: "all" | AdminFeedbackType;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UpdateAdminFeedbackPayload {
  status?: AdminFeedbackStatus;
  handler_note?: string;
}

export function getFeedbackList(params: AdminFeedbackListParams) {
  return get<PaginatedData<AdminFeedback>>("/admin/feedback", params as unknown as Record<string, unknown>);
}

export function updateFeedback(id: string, payload: UpdateAdminFeedbackPayload) {
  return patch<AdminFeedback>(`/admin/feedback/${id}`, payload);
}
