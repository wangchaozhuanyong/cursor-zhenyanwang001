import { useEffect, useState } from "react";
import * as contentService from "@/services/contentService";
import type { SiteInfo } from "@/types/content";

const FALLBACK: SiteInfo = {
  siteName: "大马严选",
  siteDescription: "精选全球好物，品质生活购物平台",
  siteSlogan: "精选全球好物，品质生活",
  brandColor: "#caa45c",
  contactPhone: "+60 12-345 6789",
  contactEmail: "support@example.com",
  contactWhatsApp: "60123456789",
  whatsappUrl: "",
  wechatId: "ZhenYan_CS",
  address: "Kuala Lumpur, Malaysia",
  businessHours: "周一至周日 09:00 - 22:00",
  currency: "RM",
  footerCompanyName: "大马严选",
  footerCopyright: `© ${new Date().getFullYear()} 大马严选 版权所有`,
  newArrivalHeroTitle: "新品优选",
  newArrivalHeroSubtitle: "精选人气新品，限时好价",
  newArrivalHeroCtaText: "立即选购",
  supportText: "官方客服在线，售后无忧",
  shippingNotice: "全站商品支持配送，具体以结算页说明为准",
  paymentNotice: "下单后请按页面提示完成支付",
};

let cachedInfo: SiteInfo | null = null;
let inflight: Promise<SiteInfo> | null = null;
const subscribers = new Set<(info: SiteInfo) => void>();

function looksLikeMojibake(value: string): boolean {
  if (!value) return false;
  return /�|锟|鈥|銆|鍟|鐧|璇|绠|閫|鎴|鏄|鐨|鍙|娴|鏂/.test(value);
}

function sanitizeSiteInfo(data: SiteInfo): SiteInfo {
  const next = { ...data };
  const fallbackTextKeys: Array<keyof SiteInfo> = [
    "siteName",
    "siteDescription",
    "siteSlogan",
    "footerCompanyName",
    "businessHours",
    "footerCopyright",
    "newArrivalHeroTitle",
    "newArrivalHeroSubtitle",
    "newArrivalHeroCtaText",
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

async function loadOnce(): Promise<SiteInfo> {
  if (cachedInfo) return cachedInfo;
  if (inflight) return inflight;
  inflight = contentService
    .fetchSiteInfo()
    .then((data) => {
      const merged: SiteInfo = sanitizeSiteInfo({ ...FALLBACK, ...(data ?? {}) });
      cachedInfo = merged;
      notifyAll(merged);
      return merged;
    })
    .catch(() => {
      cachedInfo = FALLBACK;
      notifyAll(FALLBACK);
      return FALLBACK;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function refreshSiteInfo() {
  cachedInfo = null;
  inflight = null;
  return loadOnce();
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

export const SITE_INFO_FALLBACK = FALLBACK;
