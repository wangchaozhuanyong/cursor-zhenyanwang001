import { trackAnalyticsEvent, type AnalyticsEventPayload } from "@/api/modules/analytics";
import { isAdminLoggedIn } from "@/utils/token";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function getSessionId() {
  const key = "analytics_session_id";
  const touchedKey = "analytics_session_touched_at";
  const now = Date.now();
  let id = window.sessionStorage.getItem(key);
  const touchedAt = Number(window.sessionStorage.getItem(touchedKey) || 0);
  const expired = !touchedAt || now - touchedAt > SESSION_TIMEOUT_MS;
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(key, id);
  } else if (expired) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(key, id);
  }
  window.sessionStorage.setItem(touchedKey, String(now));
  return id;
}

export function getAnonymousId() {
  const key = "analytics_anonymous_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

function isAdminTraffic(pathname = window.location.pathname) {
  return pathname.startsWith("/admin") || isAdminLoggedIn();
}

function inferDevice() {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|android|iphone/.test(ua)) return "mobile";
  return "desktop";
}

function inferBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/MicroMessenger/i.test(ua)) return "WeChat";
  return "";
}

function inferOs() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  return "";
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
  };
}

function getReferrerDomain(referrer: string) {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function inferTrafficSource(referrer: string, utm: ReturnType<typeof getUtmParams>) {
  if (utm.utm_source || utm.utm_medium || utm.utm_campaign) return "campaign";
  const domain = getReferrerDomain(referrer);
  if (!domain) return "direct";
  return "referral";
}

function enrichPayload(payload: AnalyticsEventPayload): AnalyticsEventPayload | null {
  const path = payload.path || payload.page || window.location.pathname;
  if (isAdminTraffic(path)) return null;
  const referrer = payload.referrer ?? document.referrer ?? "";
  const utm = getUtmParams();
  return {
    ...payload,
    ...utm,
    page: payload.page || path,
    path,
    url: payload.url || window.location.href,
    title: payload.title || document.title,
    referrer,
    referrer_domain: payload.referrer_domain || getReferrerDomain(referrer),
    traffic_source: payload.traffic_source || inferTrafficSource(referrer, utm),
    session_id: payload.session_id || getSessionId(),
    anonymous_id: payload.anonymous_id || getAnonymousId(),
    device: payload.device || inferDevice(),
    browser: payload.browser || inferBrowser(),
    os: payload.os || inferOs(),
    browser_language: payload.browser_language || navigator.language,
    screen_width: payload.screen_width ?? window.screen.width,
    screen_height: payload.screen_height ?? window.screen.height,
    viewport_width: payload.viewport_width ?? window.innerWidth,
    viewport_height: payload.viewport_height ?? window.innerHeight,
  };
}

function sendBeaconPayload(payload: AnalyticsEventPayload) {
  if (!navigator.sendBeacon) return false;
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  return navigator.sendBeacon(`${API_BASE}/analytics/events`, blob);
}

export type { AnalyticsEventPayload };

export async function trackEvent(payload: AnalyticsEventPayload, options?: { beacon?: boolean }): Promise<void> {
  const enriched = enrichPayload(payload);
  if (!enriched) return;
  try {
    if (options?.beacon && sendBeaconPayload(enriched)) return;
    await trackAnalyticsEvent(enriched);
  } catch {
    // keep analytics non-blocking
  }
}
