import type { ThemeConfig } from "@/types/theme";

export const THEME_PREVIEW_QUERY = "themePreview";
export const THEME_PREVIEW_APPLY = "theme-preview:apply";
export const THEME_PREVIEW_READY = "theme-preview:ready";

export type ThemePreviewApplyMessage = {
  type: typeof THEME_PREVIEW_APPLY;
  config: ThemeConfig;
  skinKey?: string;
};

export function isThemePreviewFrame() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(THEME_PREVIEW_QUERY) === "1";
}

export function isThemePreviewApplyMessage(data: unknown): data is ThemePreviewApplyMessage {
  if (!data || typeof data !== "object") return false;
  const message = data as Record<string, unknown>;
  return message.type === THEME_PREVIEW_APPLY && !!message.config && typeof message.config === "object";
}

export function buildThemePreviewUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set(THEME_PREVIEW_QUERY, "1");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}${url.hash}`;
}
