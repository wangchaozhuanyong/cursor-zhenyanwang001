import * as telegramApi from "@/api/admin/telegram";

export type { TelegramStatus, TelegramLogRow } from "@/api/admin/telegram";

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
