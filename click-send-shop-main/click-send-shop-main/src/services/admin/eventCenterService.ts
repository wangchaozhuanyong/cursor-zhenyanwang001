import * as eventApi from "@/api/admin/eventCenter";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export type {
  AdminEventBossMetrics,
  AdminEventCategory,
  AdminEventListParams,
  AdminEventRecord,
  AdminEventRule,
  AdminEventSeverity,
  AdminEventStatus,
  AdminEventSummary,
} from "@/api/admin/eventCenter";

export async function fetchAdminEvents(params?: eventApi.AdminEventListParams): Promise<PaginatedData<eventApi.AdminEventRecord>> {
  const res = await eventApi.getAdminEvents(params);
  return unwrapPaginated<eventApi.AdminEventRecord>(res.data);
}

export async function fetchAdminEventSummary(params?: Pick<eventApi.AdminEventListParams, "tab" | "category" | "severity" | "unread" | "keyword">) {
  const res = await eventApi.getAdminEventSummary(params);
  return res.data;
}

export async function fetchAdminEventBossMetrics() {
  const res = await eventApi.getAdminEventBossMetrics();
  return res.data;
}

export async function fetchAdminEventRules() {
  const res = await eventApi.getAdminEventRules();
  return res.data;
}

export async function markAdminEventRead(id: string) {
  const res = await eventApi.markAdminEventRead(id);
  return res.data;
}

export async function hideAdminEvent(id: string) {
  const res = await eventApi.hideAdminEvent(id);
  return res.data;
}

export async function markAdminEventSoundPlayed(id: string) {
  const res = await eventApi.markAdminEventSoundPlayed(id);
  return res.data;
}

export async function markAdminEventPopupSeen(id: string) {
  const res = await eventApi.markAdminEventPopupSeen(id);
  return res.data;
}

export async function acknowledgeAdminEvent(id: string, remark?: string) {
  const res = await eventApi.acknowledgeAdminEvent(id, remark);
  return res.data;
}

export async function startAdminEventProgress(id: string, remark?: string) {
  const res = await eventApi.startAdminEventProgress(id, remark);
  return res.data;
}

export async function resolveAdminEvent(id: string, remark?: string) {
  const res = await eventApi.resolveAdminEvent(id, remark);
  return res.data;
}

export async function ignoreAdminEvent(id: string, remark?: string) {
  const res = await eventApi.ignoreAdminEvent(id, remark);
  return res.data;
}
