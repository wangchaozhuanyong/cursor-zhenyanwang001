import {
  detectChinaBrowserVendor,
  isChinaChromiumShell,
  isLikelyLegacyChinaBrowserMode,
  type ChinaBrowserVendor,
} from "@/utils/chinaBrowser";

export type BrowserPlatform = "ios" | "android" | "desktop";
export type BrowserName =
  | "chrome"
  | "safari"
  | "edge"
  | "firefox"
  | "samsung"
  | "wechat"
  | "qq"
  | "uc"
  | "other";

export interface BrowserEnv {
  platform: BrowserPlatform;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isEdge: boolean;
  isFirefox: boolean;
  isSamsungInternet: boolean;
  isDesktopChromium: boolean;
  isInAppBrowser: boolean;
  browserName: BrowserName;
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
      isEdge: false,
      isFirefox: false,
      isSamsungInternet: false,
      isDesktopChromium: false,
      isInAppBrowser: false,
      browserName: "other",
      chinaBrowserVendor: null,
      isChinaChromiumShell: false,
      isLegacyChinaBrowserMode: false,
    };
  }

  return detectBrowserEnvFromUa(window.navigator.userAgent);
}

export function detectBrowserEnvFromUa(ua: string): BrowserEnv {
  const uaLower = ua.toLowerCase();
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isEdge = /edg|edgios|edga/i.test(uaLower);
  const isFirefox = /firefox|fxios/i.test(uaLower);
  const isSamsungInternet = /samsungbrowser/i.test(uaLower);
  const isSafari = /safari/i.test(uaLower)
    && !/crios|fxios|edgios|chrome|chromium|opr|opr\/|duckduckgo|samsungbrowser/i.test(uaLower);
  const isChrome = /chrome|crios/i.test(uaLower)
    && !/edg|opr|opera|samsungbrowser/i.test(uaLower);
  const isDesktopChromium = !isIOS
    && !isAndroid
    && (/chrome|chromium|edg/i.test(uaLower) && !/mobile/i.test(uaLower));
  const isAndroidWebView = isAndroid
    && !isSamsungInternet
    && !isEdge
    && !isFirefox
    && /; wv\)|version\/[\d.]+.*chrome/i.test(uaLower)
    && !isChrome;
  const isInAppBrowser = detectInAppBrowser(ua)
    || (isIOS && !isSafari && !isChrome)
    || isAndroidWebView;

  const platform: BrowserPlatform = isIOS ? "ios" : isAndroid ? "android" : "desktop";

  const chinaBrowserVendor = detectChinaBrowserVendor(ua);
  const browserName: BrowserName =
    chinaBrowserVendor === "wechat" ? "wechat"
      : chinaBrowserVendor === "qq" ? "qq"
        : chinaBrowserVendor === "uc" ? "uc"
          : isSamsungInternet ? "samsung"
            : isEdge ? "edge"
              : isFirefox ? "firefox"
                : isSafari ? "safari"
                  : isChrome ? "chrome"
                    : "other";

  return {
    platform,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isEdge,
    isFirefox,
    isSamsungInternet,
    isDesktopChromium,
    isInAppBrowser,
    browserName,
    chinaBrowserVendor,
    isChinaChromiumShell: isChinaChromiumShell(ua),
    isLegacyChinaBrowserMode: isLikelyLegacyChinaBrowserMode(ua),
  };
}

export function getPublicSiteUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}
