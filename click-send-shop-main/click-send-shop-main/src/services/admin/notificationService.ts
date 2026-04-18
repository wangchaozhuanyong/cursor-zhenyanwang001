import * as notificationApi from "@/api/admin/notification";
import type { Notification } from "@/types/notification";
import type { PaginatedData, PaginationParams } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchNotifications(params?: PaginationParams): Promise<PaginatedData<Notification>> {
  const res = await notificationApi.getNotifications(params);
  return unwrapPaginated<Notification>(res.data);
}

export async function sendNotification(data: { title: string; content: string; type: string }) {
  const res = await notificationApi.sendNotification(data);
  return res.data;
}

export async function deleteNotification(id: string) {
  await notificationApi.deleteNotification(id);
}
