import * as activityApi from "@/api/admin/activity";
import { unwrapPaginated } from "@/services/responseNormalize";
import type { ActivityPayload, MarketingActivity } from "@/types/activity";
import type { PaginatedData } from "@/types/common";
import type { ActivityListParams } from "@/api/admin/activity";

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

export async function setActivityDisabled(id: string, disabled: boolean) {
  const res = await activityApi.setActivityDisabled(id, disabled);
  return res.data;
}

export async function deleteActivity(id: string) {
  await activityApi.deleteActivity(id);
}
