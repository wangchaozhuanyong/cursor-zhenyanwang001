import type { ThemeConfig } from "@/types/theme";

export const THEME_PREVIEW_QUERY = "themePreview";
export const THEME_PREVIEW_APPLY = "theme-preview:apply";
export const THEME_PREVIEW_READY = "theme-preview:ready";
export const THEME_PREVIEW_PARENT_ORIGIN_QUERY = "previewParentOrigin";

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

type BuildThemePreviewUrlOptions = {
  origin?: string;
  absolute?: boolean;
};

function fallbackOrigin() {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}

function normalizeOrigin(value: string | undefined | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function stripConsoleSubdomain(hostname: string) {
  return hostname.replace(/^console\./, "");
}

function isAllowedPreviewParentOrigin(parentOrigin: string, currentOrigin: string) {
  try {
    const parent = new URL(parentOrigin);
    const current = new URL(currentOrigin);
    if (parent.origin === current.origin) return true;
    if (isLoopbackHost(parent.hostname) && isLoopbackHost(current.hostname)) return true;
    if (parent.protocol !== current.protocol) return false;

    const sameConsolePair =
      stripConsoleSubdomain(parent.hostname) === stripConsoleSubdomain(current.hostname)
      && (parent.hostname.startsWith("console.") || current.hostname.startsWith("console."));

    return sameConsolePair;
  } catch {
    return false;
  }
}

export function getStorefrontPreviewOrigin(currentOrigin = fallbackOrigin()) {
  const origin = normalizeOrigin(currentOrigin) ?? fallbackOrigin();
  try {
    const url = new URL(origin);
    if (url.hostname.startsWith("console.")) {
      url.hostname = stripConsoleSubdomain(url.hostname);
    }
    return url.origin;
  } catch {
    return origin;
  }
}

export function getThemePreviewParentOrigin(
  search = typeof window === "undefined" ? "" : window.location.search,
  currentOrigin = fallbackOrigin(),
) {
  const fallback = normalizeOrigin(currentOrigin) ?? fallbackOrigin();
  const candidate = normalizeOrigin(new URLSearchParams(search).get(THEME_PREVIEW_PARENT_ORIGIN_QUERY));
  if (candidate && isAllowedPreviewParentOrigin(candidate, fallback)) return candidate;
  return fallback;
}

export function buildThemePreviewUrl(
  path: string,
  params: Record<string, string | number | undefined> = {},
  options: BuildThemePreviewUrlOptions = {},
) {
  const origin = options.origin ?? fallbackOrigin();
  const url = new URL(path, origin);
  url.searchParams.set(THEME_PREVIEW_QUERY, "1");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return options.absolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}
