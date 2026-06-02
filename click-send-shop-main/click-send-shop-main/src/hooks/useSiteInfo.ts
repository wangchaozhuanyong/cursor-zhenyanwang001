import { useEffect, useState } from "react";
import * as contentService from "@/services/contentService";
import * as homeService from "@/services/homeService";
import type { SiteInfo } from "@/types/content";

const FALLBACK: SiteInfo = {
  siteName: "官方商城",
  siteDescription: "本平台提供商品、服务与客户支持信息。",
  siteSlogan: "官方商品与服务平台",
  contactPhone: "",
  contactEmail: "",
  address: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  xhsUrl: "",
  currency: "RM",
  footerCompanyName: "官方商城",
  footerCopyright: `© ${new Date().getFullYear()} 官方商城 版权所有`,
  newArrivalSectionTitle: "",
  newArrivalSectionSubtitle: "",
  newArrivalDisplayCount: "8",
  newArrivalShowPrice: "1",
  newArrivalOnlyInStock: "1",
  supportDownloadConfig: "",
  supportText: "官方客服在线，售后无忧",
  shippingNotice: "全站商品支持配送，具体以结算页说明为准",
  paymentNotice: "下单后请按页面提示完成支付",
};

let cachedInfo: SiteInfo | null = null;
let inflight: Promise<SiteInfo> | null = null;
const subscribers = new Set<(info: SiteInfo) => void>();
const SITE_INFO_RETRY_DELAYS_MS = [1_500, 3_000, 6_000] as const;
let retryTimer: ReturnType<typeof window.setTimeout> | null = null;
let retryAttempt = 0;

function looksLikeMojibake(value: string): boolean {
  if (!value) return false;
  // encoding-check: ignore-next-line
  return /�|锟|鈥|銆|鍟|鐧|璇|绠|閫|鎴|鏄|鐨|鍙|娴|鏂/.test(value);
}

function sanitizeSiteInfo(data: SiteInfo): SiteInfo {
  const next = { ...data };
  const legacyOg = next as SiteInfo & { defaultOgImageUrl?: string };
  if (!String(next.ogImageUrl ?? "").trim() && String(legacyOg.defaultOgImageUrl ?? "").trim()) {
    next.ogImageUrl = legacyOg.defaultOgImageUrl;
  }
  delete legacyOg.defaultOgImageUrl;
  const fallbackTextKeys: Array<keyof SiteInfo> = [
    "siteName",
    "siteDescription",
    "siteSlogan",
    "footerCompanyName",
    "footerCopyright",
    "supportText",
    "shippingNotice",
    "paymentNotice",
  ];
  for (const key of fallbackTextKeys) {
    const value = next[key];
    const fallbackValue = FALLBACK[key];
    if (typeof value === "string" && typeof fallbackValue === "string" && looksLikeMojibake(value)) {
      next[key] = fallbackValue as SiteInfo[typeof key];
    }
  }
  return next;
}

function notifyAll(info: SiteInfo) {
  subscribers.forEach((cb) => cb(info));
}

function clearRetryTimer() {
  if (retryTimer) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function applyLoadedInfo(info: SiteInfo) {
  clearRetryTimer();
  retryAttempt = 0;
  cachedInfo = info;
  notifyAll(info);
}

function notifyFallbackAndScheduleRetry() {
  notifyAll(FALLBACK);

  if (typeof window === "undefined") return FALLBACK;
  if (cachedInfo || retryTimer || retryAttempt >= SITE_INFO_RETRY_DELAYS_MS.length) return FALLBACK;

  const delay = SITE_INFO_RETRY_DELAYS_MS[retryAttempt] ?? SITE_INFO_RETRY_DELAYS_MS[SITE_INFO_RETRY_DELAYS_MS.length - 1];
  retryAttempt += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void loadOnce();
  }, delay);

  return FALLBACK;
}

async function loadOnce(): Promise<SiteInfo> {
  if (cachedInfo) return cachedInfo;
  if (inflight) return inflight;
  inflight = homeService.fetchHomeBootstrap().then((b) => b.siteInfo).catch(() => contentService.fetchSiteInfo())
    .then((data) => {
      const merged: SiteInfo = sanitizeSiteInfo({ ...FALLBACK, ...(data ?? {}) });
      applyLoadedInfo(merged);
      return merged;
    })
    .catch(() => {
      return notifyFallbackAndScheduleRetry();
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function refreshSiteInfo() {
  clearRetryTimer();
  retryAttempt = 0;
  cachedInfo = null;
  inflight = null;
  homeService.invalidateHomeBootstrapCache();
  inflight = homeService.fetchHomeBootstrap({ force: true }).then((b) => b.siteInfo).catch(() => contentService.fetchSiteInfo())
    .then((data) => {
      const merged: SiteInfo = sanitizeSiteInfo({ ...FALLBACK, ...(data ?? {}) });
      applyLoadedInfo(merged);
      return merged;
    })
    .catch(() => {
      return notifyFallbackAndScheduleRetry();
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useSiteInfo(): SiteInfo {
  const [info, setInfo] = useState<SiteInfo>(cachedInfo ?? FALLBACK);

  useEffect(() => {
    const sub = (next: SiteInfo) => setInfo(next);
    subscribers.add(sub);
    if (cachedInfo) {
      setInfo(cachedInfo);
    } else {
      loadOnce();
    }
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  return info;
}

export function useSiteInfoLoaded(): boolean {
  const [loaded, setLoaded] = useState(Boolean(cachedInfo));

  useEffect(() => {
    if (cachedInfo) {
      setLoaded(true);
      return;
    }

    let mounted = true;
    loadOnce().finally(() => {
      if (mounted) setLoaded(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return loaded;
}

export const SITE_INFO_FALLBACK = FALLBACK;
