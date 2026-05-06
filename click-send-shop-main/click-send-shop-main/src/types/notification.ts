export type NotificationType = "system" | "order" | "promotion" | "points" | "reward";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  audience_type?: "all" | "single" | "specific";
  send_status?: "draft" | "sent" | "scheduled" | "cancelled";
  workflow_status?: "draft" | "published" | "cancelled";
  recipient_count?: number;
  read_count?: number;
  scheduled_at?: string | null;
  sent_at?: string | null;
  link_url?: string | null;
  template_code?: string | null;
}

export interface NotificationListParams {
  type?: NotificationType;
  is_read?: boolean;
  page?: number;
  pageSize?: number;
}
