import type { AdminLocale } from "@/i18n/admin";

const REGION_ZH: Record<string, string> = {
  Africa: "非洲",
  America: "美洲",
  Antarctica: "南极洲",
  Arctic: "北极",
  Asia: "亚洲",
  Atlantic: "大西洋",
  Australia: "澳洲",
  Europe: "欧洲",
  Indian: "印度洋",
  Pacific: "太平洋",
};

const LOCATION_ZH: Record<string, string> = {
  Shanghai: "上海",
  Beijing: "北京",
  Chongqing: "重庆",
  Hong_Kong: "香港",
  Macau: "澳门",
  Taipei: "台北",
  Kuala_Lumpur: "吉隆坡",
  Singapore: "新加坡",
  Bangkok: "曼谷",
  Jakarta: "雅加达",
  Manila: "马尼拉",
  Tokyo: "东京",
  Seoul: "首尔",
  Kolkata: "加尔各答",
  Dubai: "迪拜",
  Riyadh: "利雅得",
  Sydney: "悉尼",
  Melbourne: "墨尔本",
  Auckland: "奥克兰",
  London: "伦敦",
  Paris: "巴黎",
  Berlin: "柏林",
  New_York: "纽约",
  Los_Angeles: "洛杉矶",
  Chicago: "芝加哥",
  UTC: "协调世界时",
  GMT: "格林威治",
};

function formatLocationSegment(segment: string): string {
  if (LOCATION_ZH[segment]) return LOCATION_ZH[segment];
  return segment
    .split("_")
    .map((part) => LOCATION_ZH[part] ?? part)
    .join("");
}

/** IANA 时区：中文环境显示为「亚洲/吉隆坡」，英文环境保留原值。 */
export function formatTimezoneLabel(timezone: string, locale: AdminLocale = "zh"): string {
  const tz = timezone?.trim();
  if (!tz) return "";
  if (locale === "en") return tz;

  const slash = tz.indexOf("/");
  if (slash === -1) {
    try {
      const label = new Intl.DisplayNames("zh-CN", { type: "timeZone" }).of(tz);
      return label && label !== tz ? label : tz;
    } catch {
      return tz;
    }
  }

  const regionKey = tz.slice(0, slash);
  const locationKey = tz.slice(slash + 1);
  const regionLabel = REGION_ZH[regionKey] ?? regionKey;
  const locationLabel = formatLocationSegment(locationKey);
  return `${regionLabel}/${locationLabel}`;
}
