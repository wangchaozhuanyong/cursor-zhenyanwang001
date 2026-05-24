/**
 * 中国常用浏览器 / 内置 WebView UA 识别（用于兼容策略与统计，不用于封禁）。
 */
export type ChinaBrowserVendor =
  | "wechat"
  | "alipay"
  | "dingtalk"
  | "baidu"
  | "uc"
  | "qq"
  | "qihoo360"
  | "huawei"
  | "miui"
  | "oppo"
  | "vivo"
  | "sogou"
  | "maxthon"
  | "quark"
  | "unknown_china";

const VENDOR_PATTERNS: ReadonlyArray<{ vendor: ChinaBrowserVendor; pattern: RegExp }> = [
  { vendor: "wechat", pattern: /micromessenger|wechat/i },
  { vendor: "alipay", pattern: /alipayclient|alipay/i },
  { vendor: "dingtalk", pattern: /dingtalk/i },
  { vendor: "baidu", pattern: /baiduboxapp|baidubrowser|bidubrowser|baiduhd/i },
  { vendor: "uc", pattern: /\bucbrowser\b|\bucweb\b|ubrowser/i },
  { vendor: "qq", pattern: /\bmqqbrowser\b|\bqqbrowser\b/i },
  { vendor: "qihoo360", pattern: /360browser|360se|qihoobrowser|qhbrowser/i },
  { vendor: "huawei", pattern: /huaweibrowser|hbpc|harmonyos.*browser/i },
  { vendor: "miui", pattern: /miuibrowser|xiaomi/i },
  { vendor: "oppo", pattern: /heytapbrowser|oppobrowser/i },
  { vendor: "vivo", pattern: /vivobrowser/i },
  { vendor: "sogou", pattern: /metasr|sogoumobilebrowser|sogoumse/i },
  { vendor: "maxthon", pattern: /maxthon/i },
  { vendor: "quark", pattern: /quark/i },
];

export function detectChinaBrowserVendor(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): ChinaBrowserVendor | null {
  const text = ua.trim();
  if (!text) return null;
  for (const { vendor, pattern } of VENDOR_PATTERNS) {
    if (pattern.test(text)) return vendor;
  }
  return null;
}

/** 是否为常见国产 Chromium 壳（极速模式一般可正常运行现代站点） */
export function isChinaChromiumShell(ua?: string): boolean {
  const text = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const vendor = detectChinaBrowserVendor(text);
  if (!vendor) return false;
  if (vendor === "wechat" || vendor === "alipay" || vendor === "dingtalk") return true;
  return /chrome|chromium|crios/i.test(text);
}

/** 是否可能处于 IE/兼容模式（应提示用户切换极速模式） */
export function isLikelyLegacyChinaBrowserMode(ua?: string): boolean {
  if (typeof document !== "undefined" && (document as Document & { documentMode?: number }).documentMode) {
    return true;
  }
  const text = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /MSIE |Trident\//.test(text);
}

export function getChinaBrowserCompatHint(ua?: string): string | null {
  if (isLikelyLegacyChinaBrowserMode(ua)) {
    return "检测到兼容/IE 模式，请在浏览器设置中切换为「极速模式」或更换 Chrome/Edge 后重试。";
  }
  const vendor = detectChinaBrowserVendor(ua);
  if (!vendor) return null;
  if (vendor === "baidu" || vendor === "qihoo360" || vendor === "qq" || vendor === "uc") {
    return "若页面无法点击或白屏，请确认已开启「极速模式」并刷新页面。";
  }
  return null;
}
