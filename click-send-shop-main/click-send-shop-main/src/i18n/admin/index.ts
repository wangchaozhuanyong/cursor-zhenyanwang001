import type { AdminLocale, AdminMessages } from "./types";
import { adminMessagesZh } from "./messages/zh";
import { adminMessagesEn } from "./messages/en";
import { adminZhToEn } from "./zhToEn";
import { fallbackTranslateAdminZh } from "./fallbackTranslate";

export const ADMIN_LOCALE_STORAGE_KEY = "admin-locale";

export function getAdminMessages(locale: AdminLocale): AdminMessages {
  return locale === "en" ? adminMessagesEn : adminMessagesZh;
}

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as unknown as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translateAdmin(
  locale: AdminLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const messages = getAdminMessages(locale);
  let text = getByPath(messages, key) ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

export function translateAdminText(locale: AdminLocale, zh: string): string {
  if (locale === "zh") return zh;
  const mapped = adminZhToEn[zh];
  if (mapped && mapped !== zh && !/[\u4e00-\u9fff]/.test(mapped)) return mapped;
  const fallback = fallbackTranslateAdminZh(zh);
  if (fallback !== zh && !/[\u4e00-\u9fff]/.test(fallback)) return fallback;
  return mapped ?? zh;
}

export type { AdminLocale, AdminMessages };
