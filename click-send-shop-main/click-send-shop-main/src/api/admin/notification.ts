import { get, post, del } from "../request";
import type { Notification } from "@/types/notification";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getNotifications(params?: PaginationParams) {
  return get<PaginatedData<Notification>>("/admin/notifications", params as Record<string, string>);
}

export function sendNotification(data: { title: string; content: string; type: string }) {
  return post<Notification>("/admin/notifications", data);
}

export function deleteNotification(id: string) {
  return del<void>(`/admin/notifications/${id}`);
}
