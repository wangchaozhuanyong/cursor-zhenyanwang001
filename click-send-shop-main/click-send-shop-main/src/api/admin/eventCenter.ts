import { get, put } from "@/api/request";
import type { PaginatedData } from "@/types/common";

export type AdminEventStatus = "open" | "acknowledged" | "in_progress" | "resolved" | "auto_resolved" | "ignored" | "expired";
export type AdminEventSeverity = "P0" | "P1" | "P2" | "P3";
export type AdminEventCategory = "order" | "payment" | "refund" | "stock" | "content" | "consistency" | "security" | "system" | string;

export type AdminEventRecord = {
  id: string;
  eventType: string;
  category: AdminEventCategory;
  severity: AdminEventSeverity;
  status: AdminEventStatus;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  fingerprint: string;
  activeDedupeKey?: string | null;
  payload?: unknown;
  diagnosis?: {
    state: "still_active" | "needs_check" | "review_required" | "closed" | string;
    summary: string;
    nextAction: string;
    linkUrl?: string;
    linkText?: string;
    closeHint?: string;
  };
  impactAmount?: number | null;
  source: string;
  seenCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt?: string | null;
  inProgressAt?: string | null;
  resolvedAt?: string | null;
  expiredAt?: string | null;
  escalatedAt?: string | null;
  readAt?: string | null;
  hiddenAt?: string | null;
  soundPlayedAt?: string | null;
  popupSeenAt?: string | null;
  popupEnabled: boolean;
  soundEnabled: boolean;
  escalationMinutes?: number | null;
  escalationTarget?: string | null;
  autoResolveEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminEventListParams = {
  page?: number;
  pageSize?: number;
  tab?: "all" | "pending" | "urgent" | "security" | "recovered";
  status?: AdminEventStatus | "pending" | "recovered";
  category?: AdminEventCategory;
  severity?: AdminEventSeverity;
  unread?: "1" | boolean;
  keyword?: string;
};

export type AdminEventSummary = {
  unreadCount: number;
  unresolvedCount: number;
  p0Count: number;
  securityCount: number;
  recoveredCount: number;
  /** 按当前 tab 筛选后、各分类下可见事件数量 */
  categoryCounts?: Record<string, number>;
  /** 各 Tab 下可见事件数量（与列表 Tab 筛选一致） */
  tabCounts?: {
    all: number;
    pending: number;
    urgent: number;
    security: number;
    recovered: number;
  };
};

export type AdminEventBossMetrics = {
  revenueEventsToday: number;
  pendingOrders: number;
  paidUnshipped: number;
  refundPending: number;
  stockRisks: number;
  paymentAnomalies: number;
  consistencyAnomalies: number;
  securityRisks: number;
  systemHealthRisks: number;
};

export type AdminEventRule = {
  id: number;
  event_type: string;
  category: AdminEventCategory;
  severity: AdminEventSeverity;
  title: string;
  enabled: boolean;
  popup_enabled: boolean;
  sound_enabled: boolean;
  escalation_minutes?: number | null;
  escalation_target?: string | null;
  auto_resolve_enabled: boolean;
  config?: unknown;
};

export function getAdminEvents(params?: AdminEventListParams) {
  return get<PaginatedData<AdminEventRecord>>("/admin/event-center/events", params as unknown as Record<string, string>);
}

export function getAdminEventSummary(params?: Pick<AdminEventListParams, "tab" | "category" | "severity" | "unread" | "keyword">) {
  return get<AdminEventSummary>("/admin/event-center/summary", params as unknown as Record<string, string>);
}

export function getAdminEventBossMetrics() {
  return get<AdminEventBossMetrics>("/admin/event-center/boss-metrics");
}

export function getAdminEventRules() {
  return get<AdminEventRule[]>("/admin/event-center/rules");
}

export function markAdminEventRead(id: string) {
  return put<{ ok: true }>(`/admin/event-center/events/${id}/read`);
}

export function hideAdminEvent(id: string) {
  return put<{ ok: true }>(`/admin/event-center/events/${id}/hide`);
}

export function markAdminEventSoundPlayed(id: string) {
  return put<{ ok: true }>(`/admin/event-center/events/${id}/sound-played`);
}

export function markAdminEventPopupSeen(id: string) {
  return put<{ ok: true }>(`/admin/event-center/events/${id}/popup-seen`);
}

export function acknowledgeAdminEvent(id: string, remark?: string) {
  return put<{ event: AdminEventRecord }>(`/admin/event-center/events/${id}/acknowledge`, { remark });
}

export function startAdminEventProgress(id: string, remark?: string) {
  return put<{ event: AdminEventRecord }>(`/admin/event-center/events/${id}/in-progress`, { remark });
}

export function resolveAdminEvent(id: string, remark?: string) {
  return put<{ event: AdminEventRecord }>(`/admin/event-center/events/${id}/resolve`, { remark });
}

export function ignoreAdminEvent(id: string, remark?: string) {
  return put<{ event: AdminEventRecord }>(`/admin/event-center/events/${id}/ignore`, { remark });
}
