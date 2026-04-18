import * as notifApi from "@/api/modules/notification";
import type { Notification, NotificationListParams } from "@/types/notification";
import type { PaginatedData } from "@/types/common";
import { unwrapCount, unwrapPaginated } from "@/services/responseNormalize";

export async function fetchNotifications(
  params?: NotificationListParams,
): Promise<PaginatedData<Notification>> {
  const res = await notifApi.getNotifications(params);
  return unwrapPaginated<Notification>(res.data);
}

export async function markAsRead(id: string): Promise<void> {
  await notifApi.markAsRead(id);
}

export async function markAllAsRead(): Promise<void> {
  await notifApi.markAllAsRead();
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await notifApi.getUnreadCount();
  return unwrapCount(res.data);
}
