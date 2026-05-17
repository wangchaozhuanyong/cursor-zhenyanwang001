import * as notificationApi from "@/api/admin/notification";
import type { Notification } from "@/types/notification";
import type { PaginatedData, PaginationParams } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";

export type NotificationQueryParams = PaginationParams & {
  keyword?: string;
  type?: string;
  send_status?: string;
  audience_type?: string;
  workflow_status?: string;
};

export async function fetchNotifications(params?: NotificationQueryParams): Promise<PaginatedData<Notification>> {
  const res = await notificationApi.getNotifications(params as unknown as Record<string, unknown>);
  return unwrapPaginated<Notification>(res.data);
}

export async function fetchNotificationSummary() {
  const res = await notificationApi.getNotificationSummary();
  return res.data;
}

export async function estimateNotificationAudience(data: notificationApi.NotificationPayload) {
  const res = await notificationApi.estimateNotificationAudience(data);
  return res.data;
}

export async function fetchNotificationDetail(
  id: string,
  params?: { read_status?: "read" | "unread"; page?: number; pageSize?: number },
) {
  const res = await notificationApi.getNotificationDetail(id, params);
  return res.data;
}

export async function resolveNotificationUsers(identifiers: string[]) {
  const res = await notificationApi.resolveNotificationUsers(identifiers);
  return res.data;
}

export async function exportNotificationRecipientsCsv(id: string, readStatus?: "read" | "unread" | "") {
  await downloadAdminCsv(notificationApi.getNotificationRecipientsExportPath(id, readStatus), `notification-${id}-recipients.csv`);
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

export async function previewNotificationTriggerRule(key: string, vars?: Record<string, string>) {
  const res = await notificationApi.previewNotificationTriggerRule({ key, vars });
  return res.data;
}

export async function testSendNotificationTriggerRule(key: string, vars?: Record<string, string>) {
  const res = await notificationApi.testSendNotificationTriggerRule({ key, vars });
  return res.data;
}

export async function deleteNotification(id: string) {
  await notificationApi.deleteNotification(id);
}

export async function deleteDraftNotification(id: string) {
  await notificationApi.deleteDraftNotification(id);
}

export async function cancelScheduledNotification(id: string) {
  await notificationApi.cancelScheduledNotification(id);
}

export async function revokeSentNotification(id: string) {
  await notificationApi.revokeSentNotification(id);
}
