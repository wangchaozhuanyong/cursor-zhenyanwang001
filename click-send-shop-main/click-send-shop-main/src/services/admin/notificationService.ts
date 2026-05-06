import * as notificationApi from "@/api/admin/notification";
import type { Notification } from "@/types/notification";
import type { PaginatedData, PaginationParams } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export type NotificationQueryParams = PaginationParams & {
  keyword?: string;
  type?: string;
  send_status?: string;
  audience_type?: string;
  workflow_status?: string;
};

export async function fetchNotifications(params?: NotificationQueryParams): Promise<PaginatedData<Notification>> {
  const res = await notificationApi.getNotifications(params);
  return unwrapPaginated<Notification>(res.data);
}

export async function sendNotification(data: notificationApi.NotificationPayload) {
  const res = await notificationApi.sendNotification(data);
  return res.data;
}

export async function saveNotificationDraft(data: notificationApi.NotificationPayload) {
  const res = await notificationApi.saveNotificationDraft(data);
  return res.data;
}

export async function publishNotification(id: string, data?: { scheduled_at?: string }) {
  const res = await notificationApi.publishNotification(id, data);
  return res.data;
}

export async function fetchNotificationTemplates() {
  const res = await notificationApi.getNotificationTemplates();
  return res.data;
}

export type NotificationTriggerRule = notificationApi.NotificationTriggerRule;

export async function fetchNotificationTriggerSettings() {
  const res = await notificationApi.getNotificationTriggerSettings();
  return res.data;
}

export async function saveNotificationTriggerSettings(rules: NotificationTriggerRule[]) {
  const res = await notificationApi.updateNotificationTriggerSettings(rules);
  return res.data;
}

export async function deleteNotification(id: string) {
  await notificationApi.deleteNotification(id);
}
