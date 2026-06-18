import * as eventApi from "@/api/admin/eventCenter";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export type {
  AdminEventBossMetrics,
  AdminEventAction,
  AdminEventCategory,
  AdminEventDetail,
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
  const cleanParams = pickEventSummaryParams(params);
  const res = await eventApi.getAdminEventSummary(cleanParams);
  return res.data;
}

function pickEventSummaryParams(params?: Pick<eventApi.AdminEventListParams, "tab" | "category" | "severity" | "unread" | "keyword">) {
  if (!params || typeof params !== "object") return undefined;
  const next: Pick<eventApi.AdminEventListParams, "tab" | "category" | "severity" | "unread" | "keyword"> = {};
  for (const key of ["tab", "category", "severity", "unread", "keyword"] as const) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      next[key] = value as never;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export async function fetchAdminEventBossMetrics() {
  const res = await eventApi.getAdminEventBossMetrics();
  return res.data;
}

export async function fetchAdminEventRules() {
  const res = await eventApi.getAdminEventRules();
  return res.data;
}

export async function updateAdminEventRule(eventType: string, payload: Partial<eventApi.AdminEventRule>) {
  const res = await eventApi.updateAdminEventRule(eventType, payload);
  return res.data;
}

export async function fetchAdminEventDetail(id: string) {
  const res = await eventApi.getAdminEventDetail(id);
  return res.data;
}

export async function fetchAdminEventActions(id: string) {
  const res = await eventApi.getAdminEventActions(id);
  return res.data;
}

export async function batchReadAdminEvents(ids: string[]) {
  const res = await eventApi.batchReadAdminEvents(ids);
  return res.data;
}

export async function batchAcknowledgeAdminEvents(ids: string[], remark?: string) {
  const res = await eventApi.batchAcknowledgeAdminEvents(ids, remark);
  return res.data;
}

export async function batchIgnoreAdminEvents(ids: string[], remark?: string) {
  const res = await eventApi.batchIgnoreAdminEvents(ids, remark);
  return res.data;
}

export async function batchResolveAdminEvents(ids: string[], remark?: string) {
  const res = await eventApi.batchResolveAdminEvents(ids, remark);
  return res.data;
}

export async function assignAdminEvent(id: string, payload: { assigneeId?: string; assigneeName?: string; remark?: string }) {
  const res = await eventApi.assignAdminEvent(id, payload);
  return res.data;
}

export async function batchAssignAdminEvents(ids: string[], payload: { assigneeId?: string; assigneeName?: string; remark?: string }) {
  const res = await eventApi.batchAssignAdminEvents(ids, payload);
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
