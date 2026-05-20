import { get, post, put } from "@/api/request";
import type { TelegramMessagePreview, TelegramNotifyConfig, TelegramNotifySettings } from "@/utils/telegramNotifyConfig";

export type { TelegramNotifySettings, TelegramMessagePreview };

export interface TelegramStatus {
  enabled: boolean;
  botTokenConfigured: boolean;
  adminChatIdConfigured: boolean;
  parseMode: string;
  includeOrderItems: boolean;
  maxMessageLength: number;
  adminFrontendUrlConfigured: boolean;
  configSource?: "env" | "database";
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

export function getTelegramSettings() {
  return get<TelegramNotifySettings>("/admin/telegram/settings");
}

export function updateTelegramSettings(body: Partial<TelegramNotifyConfig> & { botToken?: string }) {
  return put<TelegramNotifySettings>("/admin/telegram/settings", body);
}

export function previewTelegramMessage(body: Partial<TelegramNotifyConfig>) {
  return post<TelegramMessagePreview>("/admin/telegram/preview", body);
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
