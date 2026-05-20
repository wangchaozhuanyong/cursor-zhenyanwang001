import { get, post } from "@/api/request";

export interface TelegramStatus {
  enabled: boolean;
  botTokenConfigured: boolean;
  adminChatIdConfigured: boolean;
  parseMode: string;
  includeOrderItems: boolean;
  maxMessageLength: number;
  adminFrontendUrlConfigured: boolean;
}

export interface TelegramLogRow {
  id: string;
  target_type: string;
  target_id: string;
  order_id: string | null;
  event_type: string;
  send_status: "pending" | "sent" | "failed" | "skipped" | string;
  provider_message_id: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export function getTelegramStatus() {
  return get<TelegramStatus>("/admin/telegram/status");
}

export function getTelegramLogs(limit = 20) {
  return get<TelegramLogRow[]>("/admin/telegram/logs", { limit });
}

export function postTelegramTest() {
  return post<{ providerMessageId?: string }>("/admin/telegram/test");
}
