import { get, post, put, patch, del } from "../request";
import type { ActivityPayload, ActivityStatus, ActivityType, MarketingActivity } from "@/types/activity";
import type { PaginatedData, PaginationParams } from "@/types/common";

export interface ActivityListParams extends PaginationParams {
  keyword?: string;
  type?: ActivityType | "";
  status?: ActivityStatus | "";
}

export function getActivities(params?: ActivityListParams) {
  return get<PaginatedData<MarketingActivity>>("/admin/activities", params as Record<string, string>);
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

export function setActivityDisabled(id: string, disabled: boolean) {
  return patch<MarketingActivity>(`/admin/activities/${id}/status`, { disabled });
}

export function deleteActivity(id: string) {
  return del<void>(`/admin/activities/${id}`);
}
