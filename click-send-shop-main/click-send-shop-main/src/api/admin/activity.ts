import { get, post, put, patch, del } from "@/api/request";
import type { ActivityPayload, ActivityStatus, ActivityType, MarketingActivity } from "@/types/activity";
import type { PaginatedData, PaginationParams } from "@/types/common";

export type ActivityStatusAction = "pause" | "end" | "archive" | "resume" | "disable" | "enable";

export interface ActivityPrecheckIssue {
  code: string;
  severity: "blocking" | "warning" | "info";
  message: string;
  conflict_activity_id?: string;
  conflict_activity_title?: string;
  conflict_activity_type?: string;
  conflict_family?: string;
  conflict_family_label?: string;
}

export interface ActivityPrecheckSnapshot {
  activity_id: string | null;
  title: string;
  type: ActivityType;
  target_status: ActivityStatus;
  rule_version: number;
  start_at: string;
  end_at: string;
  scope_type: string;
  scope_count: number;
  item_count: number;
  display_positions: string[];
  stackable: boolean;
  exclusive_with: string[];
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  rule_summary: string;
}

export interface ActivityPrecheckResult {
  ok: boolean;
  blocking: ActivityPrecheckIssue[];
  warnings: ActivityPrecheckIssue[];
  snapshot: ActivityPrecheckSnapshot | null;
}

export interface ActivityListParams extends PaginationParams {
  keyword?: string;
  type?: ActivityType | "";
  status?: ActivityStatus | "";
}

export interface ActivityProductOption {
  id: string;
  name: string;
  cover_image?: string;
  price: number;
  stock: number;
  lifecycle_status: number;
  category_id?: string;
  category_name?: string;
  sku_count?: number;
}

export function getActivities(params?: ActivityListParams) {
  return get<PaginatedData<MarketingActivity>>("/admin/activities", params as unknown as Record<string, string>);
}

export function getActivityProductOptions(params?: Record<string, string | number>) {
  return get<PaginatedData<ActivityProductOption>>("/admin/activities/products/options", params as unknown as Record<string, string>);
}

export function getActivity(id: string) {
  return get<MarketingActivity>(`/admin/activities/${id}`);
}

export function createActivity(data: ActivityPayload) {
  return post<MarketingActivity>("/admin/activities", data);
}

export function updateActivity(id: string, data: Partial<ActivityPayload>) {
  return put<MarketingActivity>(`/admin/activities/${id}`, data);
}

export function copyActivity(id: string, data?: { title?: string; start_at?: string; end_at?: string }) {
  return post<MarketingActivity>(`/admin/activities/${id}/copy`, data || {});
}

export function validateActivity(data: Partial<ActivityPayload>, id?: string) {
  if (id) return post<{ ok: boolean }>(`/admin/activities/${id}/validate`, data);
  return post<{ ok: boolean }>("/admin/activities/validate", data);
}

export function precheckActivity(data: Partial<ActivityPayload>, id?: string) {
  if (id) return post<ActivityPrecheckResult>(`/admin/activities/${id}/precheck`, data);
  return post<ActivityPrecheckResult>("/admin/activities/precheck", data);
}

export function setActivityDisabled(id: string, disabled: boolean) {
  return patch<MarketingActivity>(`/admin/activities/${id}/status`, { disabled });
}

export function updateActivityStatus(id: string, action: ActivityStatusAction, version?: number) {
  return patch<MarketingActivity>(`/admin/activities/${id}/status`, { action, version });
}

export function deleteActivity(id: string) {
  return del<void>(`/admin/activities/${id}`);
}
