import * as telegramApi from "@/api/admin/telegram";
import type { TelegramMessagePreview, TelegramNotifyConfig, TelegramNotifySettings } from "@/utils/telegramNotifyConfig";

export type { TelegramStatus, TelegramLogRow } from "@/api/admin/telegram";
export type { TelegramNotifySettings, TelegramMessagePreview, TelegramNotifyConfig };

export async function fetchTelegramSettings() {
  const res = await telegramApi.getTelegramSettings();
  return res.data;
}

export async function saveTelegramSettings(body: Partial<TelegramNotifyConfig> & { botToken?: string }) {
  const res = await telegramApi.updateTelegramSettings(body);
  return res.data;
}

export async function previewTelegramMessage(body: Partial<TelegramNotifyConfig>) {
  const res = await telegramApi.previewTelegramMessage(body);
  return res.data;
}

export async function fetchTelegramStatus() {
  const res = await telegramApi.getTelegramStatus();
  return res.data;
}

export async function fetchTelegramLogs(limit = 20) {
  const res = await telegramApi.getTelegramLogs(limit);
  return res.data;
}

export async function sendTelegramTest() {
  const res = await telegramApi.postTelegramTest();
  return res.data;
}
