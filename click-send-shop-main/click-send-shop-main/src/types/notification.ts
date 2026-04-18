export type NotificationType = "system" | "order" | "promotion" | "points" | "reward";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListParams {
  type?: NotificationType;
  is_read?: boolean;
  page?: number;
  pageSize?: number;
}
