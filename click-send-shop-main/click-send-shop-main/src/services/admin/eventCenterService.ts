import * as eventApi from "@/api/admin/eventCenter";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export type {
  AdminEventBossMetrics,
  AdminEventCategory,
  AdminEventListParams,
  AdminEventRecord,
  AdminEventRule,
  AdminEventRulePatch,
  AdminEventAction,
  AdminEventDetail,
  AdminEventSeverity,
  AdminEventStatus,
  AdminEventSummary,
} from "@/api/admin/eventCenter";

export async function fetchAdminEvents(params?: eventApi.AdminEventListParams): Promise<PaginatedData<eventApi.AdminEventRecord>> {
  const res = await eventApi.getAdminEvents(params);
  return unwrapPaginated<eventApi.AdminEventRecord>(res.data);
}

export async function fetchAdminEventSummary(params?: Pick<eventApi.AdminEventListParams, "tab">) {
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

export async function fetchAdminEventDetail(id: string): Promise<eventApi.AdminEventDetail> {
  const res = await eventApi.getAdminEventDetail(id);
  return res.data;
}

export async function fetchAdminEventActions(id: string): Promise<eventApi.AdminEventAction[]> {
  const res = await eventApi.getAdminEventActions(id);
  return res.data;
}

export async function updateAdminEventRule(eventType: string, data: eventApi.AdminEventRulePatch) {
  const res = await eventApi.updateAdminEventRule(eventType, data);
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

export async function assignAdminEvent(id: string, data: { assigneeId?: string | null; dueAt?: string | null; priority?: string | null; remark?: string }) {
  const res = await eventApi.assignAdminEvent(id, data);
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

export async function batchAssignAdminEvents(ids: string[], data: { assigneeId?: string | null; dueAt?: string | null; priority?: string | null; remark?: string }) {
  const res = await eventApi.batchAssignAdminEvents(ids, data);
  return res.data;
}

export async function exportAdminEvents(params?: eventApi.AdminEventListParams) {
  const res = await eventApi.exportAdminEvents(params);
  return res.data;
}
