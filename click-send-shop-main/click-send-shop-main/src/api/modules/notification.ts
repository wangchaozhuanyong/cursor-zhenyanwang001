import { get, post } from "../request";
import type { Notification, NotificationListParams } from "@/types/notification";
import type { PaginatedData } from "@/types/common";

export function getNotifications(params?: NotificationListParams) {
  return get<PaginatedData<Notification>>("/notifications", params as Record<string, string>);
}

export function markAsRead(id: string) {
  return post<void>(`/notifications/${id}/read`);
}

export function markAllAsRead() {
  return post<void>("/notifications/read-all");
}

export function getUnreadCount() {
  return get<{ count: number }>("/notifications/unread-count");
}
