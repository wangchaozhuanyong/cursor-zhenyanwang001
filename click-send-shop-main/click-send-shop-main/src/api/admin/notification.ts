import { get, post, put, del } from "../request";
import type { Notification } from "@/types/notification";
import type { PaginatedData } from "@/types/common";

export function getNotifications(params?: Record<string, unknown>) {
  return get<PaginatedData<Notification>>("/admin/notifications", params as Record<string, string>);
}

export type NotificationPayload = {
  title: string;
  content: string;
  type: string;
  audience_type: "all" | "single";
  user_id?: string;
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

export function getNotificationTemplates() {
  return get<Array<{ code: string; name: string; type: string; title: string; content: string }>>("/admin/notifications/templates");
}

export interface NotificationTriggerRule {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export function getNotificationTriggerSettings() {
  return get<NotificationTriggerRule[]>("/admin/notifications/trigger-settings");
}

export function updateNotificationTriggerSettings(rules: NotificationTriggerRule[]) {
  return put<NotificationTriggerRule[]>("/admin/notifications/trigger-settings", { rules });
}

export function deleteNotification(id: string) {
  return del<void>(`/admin/notifications/${id}`);
}
