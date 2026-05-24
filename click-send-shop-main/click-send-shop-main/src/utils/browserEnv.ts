import {
  detectChinaBrowserVendor,
  isChinaChromiumShell,
  isLikelyLegacyChinaBrowserMode,
  type ChinaBrowserVendor,
} from "@/utils/chinaBrowser";

export type BrowserPlatform = "ios" | "android" | "desktop";

export interface BrowserEnv {
  platform: BrowserPlatform;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isDesktopChromium: boolean;
  isInAppBrowser: boolean;
  /** 识别到的国产浏览器厂商（微信/百度/UC 等），无则为 null */
  chinaBrowserVendor: ChinaBrowserVendor | null;
  isChinaChromiumShell: boolean;
  isLegacyChinaBrowserMode: boolean;
}

const IN_APP_PATTERNS = [
  /micromessenger/i,
  /wechat/i,
  /qq\//i,
  /mqqbrowser/i,
  /alipayclient/i,
  /dingtalk/i,
  /weibo/i,
  /line\//i,
  /fban|fbav/i,
  /instagram/i,
  /tiktok/i,
  /bytedance/i,
  /aweme/i,
  /douyin/i,
  /linkedinapp/i,
  /twitter/i,
  /snapchat/i,
];

function detectInAppBrowser(ua: string): boolean {
  return IN_APP_PATTERNS.some((pattern) => pattern.test(ua));
}

export function detectBrowserEnv(): BrowserEnv {
  if (typeof window === "undefined") {
    return {
      platform: "desktop",
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isDesktopChromium: false,
      isInAppBrowser: false,
      chinaBrowserVendor: null,
      isChinaChromiumShell: false,
      isLegacyChinaBrowserMode: false,
    };
  }

  const ua = window.navigator.userAgent;
  const uaLower = ua.toLowerCase();
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isSafari = /safari/i.test(uaLower)
    && !/crios|fxios|edgios|chrome|chromium|opr|opr\/|duckduckgo/i.test(uaLower);
  const isChrome = /chrome|crios/i.test(uaLower)
    && !/edg|opr|opera|samsungbrowser/i.test(uaLower);
  const isDesktopChromium = !isIOS
    && !isAndroid
    && (/chrome|chromium|edg/i.test(uaLower) && !/mobile/i.test(uaLower));
  const isInAppBrowser = detectInAppBrowser(ua)
    || (isIOS && !isSafari && !isChrome)
    || (isAndroid && /; wv\)|version\/[\d.]+.*chrome/i.test(uaLower) && !isChrome);

  const platform: BrowserPlatform = isIOS ? "ios" : isAndroid ? "android" : "desktop";

  const chinaBrowserVendor = detectChinaBrowserVendor(ua);

  return {
    platform,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isDesktopChromium,
    isInAppBrowser,
    chinaBrowserVendor,
    isChinaChromiumShell: isChinaChromiumShell(ua),
    isLegacyChinaBrowserMode: isLikelyLegacyChinaBrowserMode(ua),
  };
}

export function getPublicSiteUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}
