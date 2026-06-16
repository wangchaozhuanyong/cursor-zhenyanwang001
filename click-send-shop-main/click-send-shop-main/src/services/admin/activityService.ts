import * as activityApi from "@/api/admin/activity";
import { unwrapPaginated } from "@/services/responseNormalize";
import type { ActivityPayload, MarketingActivity } from "@/types/activity";
import type { PaginatedData } from "@/types/common";
import type { ActivityListParams, ActivityPrecheckResult, ActivityProductOption, ActivityStatusAction } from "@/api/admin/activity";

export type { ActivityListParams, ActivityPrecheckResult, ActivityProductOption, ActivityStatusAction } from "@/api/admin/activity";

export async function fetchActivities(params?: ActivityListParams): Promise<PaginatedData<MarketingActivity>> {
  const res = await activityApi.getActivities(params);
  return unwrapPaginated<MarketingActivity>(res.data);
}

export async function fetchActivity(id: string): Promise<MarketingActivity> {
  const res = await activityApi.getActivity(id);
  return res.data;
}

export async function createActivity(data: ActivityPayload) {
  const res = await activityApi.createActivity(data);
  return res.data;
}

export async function updateActivity(id: string, data: Partial<ActivityPayload>) {
  const res = await activityApi.updateActivity(id, data);
  return res.data;
}

export async function copyActivity(id: string, data?: { title?: string; start_at?: string; end_at?: string }) {
  const res = await activityApi.copyActivity(id, data);
  return res.data;
}

export async function setActivityDisabled(id: string, disabled: boolean) {
  const res = await activityApi.setActivityDisabled(id, disabled);
  return res.data;
}

export async function updateActivityStatus(id: string, action: ActivityStatusAction, version?: number) {
  const res = await activityApi.updateActivityStatus(id, action, version);
  return res.data;
}

export async function deleteActivity(id: string) {
  await activityApi.deleteActivity(id);
}

export async function validateActivity(data: Partial<ActivityPayload>, id?: string) {
  const res = await activityApi.validateActivity(data, id);
  return res.data;
}

export async function precheckActivity(data: Partial<ActivityPayload>, id?: string): Promise<ActivityPrecheckResult> {
  const res = await activityApi.precheckActivity(data, id);
  return res.data;
}

export async function fetchActivityProductOptions(params?: Record<string, string | number>): Promise<PaginatedData<ActivityProductOption>> {
  const res = await activityApi.getActivityProductOptions(params);
  return unwrapPaginated<ActivityProductOption>(res.data);
}
