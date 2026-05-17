import { get, post, put, patch, del } from "@/api/request";
import type { ActivityPayload, ActivityStatus, ActivityType, MarketingActivity } from "@/types/activity";
import type { PaginatedData, PaginationParams } from "@/types/common";

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

export function validateActivity(data: Partial<ActivityPayload>, id?: string) {
  if (id) return post<{ ok: boolean }>(`/admin/activities/${id}/validate`, data);
  return post<{ ok: boolean }>("/admin/activities/validate", data);
}

export function setActivityDisabled(id: string, disabled: boolean) {
  return patch<MarketingActivity>(`/admin/activities/${id}/status`, { disabled });
}

export function deleteActivity(id: string) {
  return del<void>(`/admin/activities/${id}`);
}

