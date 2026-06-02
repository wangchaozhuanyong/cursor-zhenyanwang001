import {
  trackAnalyticsEvent,
  trackAnalyticsEventsBatch,
  type AnalyticsEventPayload,
} from "@/api/modules/analytics";
import { isAdminLoggedIn } from "@/utils/token";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ANALYTICS_BATCH_DELAY_MS = 150;
const ANALYTICS_BATCH_MAX_SIZE = 20;
const SEARCH_ATTRIBUTION_KEY = "analytics_search_attribution";
const SEARCH_ATTRIBUTION_TTL_MS = 30 * 60 * 1000;
const SEARCH_ATTRIBUTABLE_EVENTS = new Set([
  "product_click",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "order_submit",
  "payment_success",
]);

let trafficAnalyticsEnabled = true;
const BATCHABLE_EVENT_TYPES = new Set<AnalyticsEventPayload["event_type"]>([
  "session_start",
  "page_view",
  "product_impression",
]);

type QueuedAnalyticsEvent = {
  payload: AnalyticsEventPayload;
  resolve: () => void;
};

let analyticsBatchTimer: ReturnType<typeof window.setTimeout> | null = null;
let analyticsBatchQueue: QueuedAnalyticsEvent[] = [];

export function setTrafficAnalyticsEnabled(enabled: boolean) {
  trafficAnalyticsEnabled = enabled;
}

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
  const domain = getReferrerDomain(referrer);
  const medium = String(utm.utm_medium || "").toLowerCase();
  if (/(cpc|ppc|paid|ads?|sem)/i.test(medium)) return "paid";
  if (utm.utm_source || utm.utm_medium || utm.utm_campaign) return "campaign";
  if (!domain) return "direct";
  if (/(google|bing|yahoo|duckduckgo|baidu|yandex)\./i.test(domain)) return "organic";
  if (/(facebook|instagram|tiktok|twitter|x\.com|whatsapp|youtube|linkedin|pinterest)\./i.test(domain)) return "social";
  return "referral";
}

export function setSearchAttribution(keyword: string) {
  const normalized = keyword.trim().slice(0, 100);
  if (!normalized) return;
  window.sessionStorage.setItem(SEARCH_ATTRIBUTION_KEY, JSON.stringify({
    keyword: normalized,
    touchedAt: Date.now(),
  }));
}

export function getSearchAttributionKeyword() {
  try {
    const raw = window.sessionStorage.getItem(SEARCH_ATTRIBUTION_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { keyword?: string; touchedAt?: number };
    if (!parsed.keyword || !parsed.touchedAt || Date.now() - parsed.touchedAt > SEARCH_ATTRIBUTION_TTL_MS) {
      window.sessionStorage.removeItem(SEARCH_ATTRIBUTION_KEY);
      return "";
    }
    return String(parsed.keyword).trim().slice(0, 100);
  } catch {
    return "";
  }
}

function enrichPayload(payload: AnalyticsEventPayload): AnalyticsEventPayload | null {
  if (!trafficAnalyticsEnabled) return null;
  const path = payload.path || payload.page || window.location.pathname;
  if (isAdminTraffic(path)) return null;
  const referrer = payload.referrer ?? document.referrer ?? "";
  const utm = getUtmParams();
  const attributionKeyword = !payload.keyword && SEARCH_ATTRIBUTABLE_EVENTS.has(payload.event_type)
    ? getSearchAttributionKeyword()
    : "";
  return {
    ...payload,
    ...utm,
    page: payload.page || path,
    path,
    keyword: payload.keyword || attributionKeyword || undefined,
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

function shouldBatchEvent(payload: AnalyticsEventPayload, options?: { beacon?: boolean }) {
  return !options?.beacon && BATCHABLE_EVENT_TYPES.has(payload.event_type);
}

function clearAnalyticsBatchTimer() {
  if (analyticsBatchTimer) {
    window.clearTimeout(analyticsBatchTimer);
    analyticsBatchTimer = null;
  }
}

async function flushAnalyticsBatch() {
  clearAnalyticsBatchTimer();
  const batch = analyticsBatchQueue;
  analyticsBatchQueue = [];
  if (batch.length === 0) return;

  const payloads = batch.map((item) => item.payload);
  try {
    if (payloads.length === 1) {
      await trackAnalyticsEvent(payloads[0]);
    } else {
      await trackAnalyticsEventsBatch(payloads);
    }
  } catch {
    await Promise.all(payloads.map((payload) => trackAnalyticsEvent(payload).catch(() => undefined)));
  } finally {
    batch.forEach((item) => item.resolve());
  }
}

function enqueueAnalyticsBatch(payload: AnalyticsEventPayload) {
  return new Promise<void>((resolve) => {
    analyticsBatchQueue.push({ payload, resolve });

    if (analyticsBatchQueue.length >= ANALYTICS_BATCH_MAX_SIZE) {
      void flushAnalyticsBatch();
      return;
    }

    if (!analyticsBatchTimer) {
      analyticsBatchTimer = window.setTimeout(() => {
        void flushAnalyticsBatch();
      }, ANALYTICS_BATCH_DELAY_MS);
    }
  });
}

export type { AnalyticsEventPayload };

export async function trackEvent(payload: AnalyticsEventPayload, options?: { beacon?: boolean }): Promise<void> {
  const enriched = enrichPayload(payload);
  if (!enriched) return;
  try {
    if (options?.beacon && sendBeaconPayload(enriched)) return;
    if (shouldBatchEvent(enriched, options)) {
      await enqueueAnalyticsBatch(enriched);
      return;
    }
    await trackAnalyticsEvent(enriched);
  } catch {
    // keep analytics non-blocking
  }
}
