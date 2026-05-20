import { useEffect, useState } from "react";
import * as contentService from "@/services/contentService";
import * as homeService from "@/services/homeService";
import type { SiteInfo } from "@/types/content";

const FALLBACK: SiteInfo = {
  siteName: "大马通",
  siteDescription: "大马通面向马来西亚华人用户，提供签证咨询、留学申请、第二家园、商业装修、本地生活服务与合规精选好物信息，支持中文客服沟通，适用地区以马来西亚本地为主。",
  siteSlogan: "马来西亚华人一站式生活服务与合规精选好物平台",
  contactPhone: "",
  contactEmail: "",
  contactWhatsApp: "",
  whatsappUrl: "",
  wechatId: "",
  address: "",
  businessHours: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  xhsUrl: "",
  currency: "RM",
  footerCompanyName: "大马通",
  footerCopyright: `© ${new Date().getFullYear()} 大马通 版权所有`,
  newArrivalSectionTitle: "",
  newArrivalSectionSubtitle: "",
  newArrivalDisplayCount: "8",
  newArrivalShowPrice: "1",
  newArrivalOnlyInStock: "1",
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
  if (typeof next.faviconUrl === "string" && next.faviconUrl.trim().startsWith("data:")) {
    next.faviconUrl = "";
  }
  return next;
}

function notifyAll(info: SiteInfo) {
  subscribers.forEach((cb) => cb(info));
}

async function loadOnce(): Promise<SiteInfo> {
  if (cachedInfo) return cachedInfo;
  if (inflight) return inflight;
  inflight = homeService.fetchHomeBootstrap().then((b) => b.siteInfo).catch(() => contentService.fetchSiteInfo())
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


