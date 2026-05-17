import { get, post, put, del } from "@/api/request";
import type { Notification } from "@/types/notification";
import type { PaginatedData } from "@/types/common";

export function getNotifications(params?: Record<string, unknown>) {
  return get<PaginatedData<Notification>>("/admin/notifications", params as Record<string, string>);
}

export type NotificationPayload = {
  title: string;
  content: string;
  type: string;
  audience_type: "all" | "single" | "specific" | "user_tag" | "member_level" | "has_order" | "no_order";
  user_id?: string;
  user_ids?: string[];
  audience_value?: string;
  user_tag_ids?: string[];
  scheduled_at?: string;
  link_url?: string;
  template_code?: string;
};

export function sendNotification(data: NotificationPayload) {
  return post<Notification>("/admin/notifications", data);
}

export function saveNotificationDraft(data: NotificationPayload) {
  return post<Notification>("/admin/notifications/drafts", data);
}

export function publishNotification(id: string, data?: { scheduled_at?: string }) {
  return put<Notification>(`/admin/notifications/${id}/publish`, data || {});
}

export function getNotificationSummary() {
  return get<{
    totalBatches: number;
    draftCount: number;
    scheduledCount: number;
    sentCount: number;
    cancelledCount: number;
    totalRecipients: number;
    totalRead: number;
    readRate: number;
  }>("/admin/notifications/summary");
}

export function estimateNotificationAudience(data: NotificationPayload) {
  return post<{ audience_type: string; estimated_recipients: number }>("/admin/notifications/audience-estimate", data);
}

export function getNotificationDetail(id: string, params?: { read_status?: "read" | "unread"; page?: number; pageSize?: number }) {
  return get<{
    id: string;
    title: string;
    content: string;
    type: string;
    audience_type: string;
    audience_value?: string | null;
    send_status: string;
    workflow_status: string;
    link_url?: string | null;
    scheduled_at?: string | null;
    sent_at?: string | null;
    created_at: string;
    recipient_count: number;
    read_count: number;
    read_rate: number;
    recipients: {
      list: Array<{ id: string; user_id: string; nickname?: string; phone?: string; whatsapp?: string; is_read: 0 | 1 }>;
      total: number;
      page: number;
      pageSize: number;
    };
    logs: Array<{ id: string; operator_name?: string; action_type: string; summary?: string; result?: string; created_at: string }>;
  }>(`/admin/notifications/${id}`, params as Record<string, string>);
}

export function resolveNotificationUsers(identifiers: string[]) {
  return post<{ list: Array<{ id: string; nickname?: string; phone?: string; whatsapp?: string }>; unresolved: string[] }>(
    "/admin/notifications/resolve-users",
    { identifiers },
  );
}

export function getNotificationRecipientsExportPath(id: string, readStatus?: "read" | "unread" | "") {
  const qs = readStatus ? `?read_status=${readStatus}` : "";
  return `/admin/notifications/${id}/recipients/export${qs}`;
}

export function getNotificationTemplates() {
  return get<Array<{ code: string; name: string; type: string; title: string; content: string }>>("/admin/notifications/templates");
}

export interface NotificationTriggerRule {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  /** 鑷畾涔夋爣棰樻ā鏉匡紝绌哄瓧绗︿覆琛ㄧず浣跨敤 default_title */
  title?: string;
  /** 自定义正文模板，空字符串表示使用 default_content */
  content?: string;
  default_title?: string;
  default_content?: string;
  placeholders?: string[];
}

export function getNotificationTriggerSettings() {
  return get<NotificationTriggerRule[]>("/admin/notifications/trigger-settings");
}

export function updateNotificationTriggerSettings(rules: NotificationTriggerRule[]) {
  return put<NotificationTriggerRule[]>("/admin/notifications/trigger-settings", { rules });
}

export function previewNotificationTriggerRule(data: { key: string; vars?: Record<string, string> }) {
  return post<{ title: string; content: string }>("/admin/notifications/trigger-settings/preview", data);
}

export function testSendNotificationTriggerRule(data: { key: string; vars?: Record<string, string> }) {
  return post<{ batch_id: string; key: string }>("/admin/notifications/trigger-settings/test-send", data);
}

export function deleteNotification(id: string) {
  return del<void>(`/admin/notifications/${id}`);
}

export function deleteDraftNotification(id: string) {
  return del<void>(`/admin/notifications/${id}/draft`);
}

export function cancelScheduledNotification(id: string) {
  return put<void>(`/admin/notifications/${id}/cancel`, {});
}

export function revokeSentNotification(id: string) {
  return put<void>(`/admin/notifications/${id}/revoke`, {});
}

