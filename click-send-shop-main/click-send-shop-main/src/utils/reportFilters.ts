import type { ReportFilterProfile } from "@/config/reportPageConfig";

/** 报表筛选栏可展示的筛选项（与 URL query key 对应） */
export type ReportFilterKey =
  | "dateRange"
  | "granularity"
  | "categoryId"
  | "productId"
  | "activityId"
  | "couponId"
  | "couponCampaignId"
  | "orderStatus"
  | "paymentStatus"
  | "paymentMethod"
  | "keyword"
  | "noResultOnly"
  | "sortBy";

const FILTER_KEYS_BY_PROFILE: Record<ReportFilterProfile, ReportFilterKey[]> = {
  none: [],
  date: ["dateRange"],
  dateCategory: ["dateRange", "categoryId"],
  dateProduct: ["dateRange", "categoryId", "productId"],
  dateOrder: ["dateRange", "orderStatus", "paymentStatus", "paymentMethod"],
  dateCustomer: ["dateRange"],
  dateActivity: ["dateRange", "activityId"],
  dateCoupon: ["dateRange", "couponCampaignId", "couponId"],
};

const URL_KEY_BY_FILTER: Record<ReportFilterKey, string[]> = {
  dateRange: ["range_preset", "date_from", "date_to"],
  granularity: ["granularity"],
  categoryId: ["category_id"],
  productId: ["product_id"],
  activityId: ["activity_id"],
  couponId: ["coupon_id"],
  couponCampaignId: ["coupon_campaign_id"],
  orderStatus: ["order_status"],
  paymentStatus: ["payment_status"],
  paymentMethod: ["payment_method"],
  keyword: ["keyword"],
  noResultOnly: ["no_result_only"],
  sortBy: ["sort_by", "sort_order"],
};

export function getEnabledFilters(
  filterProfile: ReportFilterProfile,
  options?: { supportsGranularity?: boolean; extra?: ReportFilterKey[] },
): ReportFilterKey[] {
  const base = [...(FILTER_KEYS_BY_PROFILE[filterProfile] ?? [])];
  if (options?.supportsGranularity && !base.includes("granularity")) {
    base.push("granularity");
  }
  if (options?.extra?.length) {
    for (const key of options.extra) {
      if (!base.includes(key)) base.push(key);
    }
  }
  return base;
}

export function isFilterEnabled(enabled: ReportFilterKey[], key: ReportFilterKey) {
  return enabled.includes(key);
}

/** 去掉当前报表不支持的 query，避免无效参数进入请求 */
export function sanitizeReportSearchParams(
  params: URLSearchParams,
  enabled: ReportFilterKey[],
): URLSearchParams {
  const allowed = new Set<string>();
  for (const key of enabled) {
    for (const urlKey of URL_KEY_BY_FILTER[key]) {
      allowed.add(urlKey);
    }
  }
  const next = new URLSearchParams();
  params.forEach((value, urlKey) => {
    if (allowed.has(urlKey)) next.set(urlKey, value);
  });
  if (allowed.has("range_preset") && !next.has("range_preset")) {
    next.set("range_preset", "last_7_days");
  }
  return next;
}

/** 仅将已启用筛选项传给后端 */
export function pickReportQueryParams(
  params: Record<string, string>,
  enabled: ReportFilterKey[],
): Record<string, string> {
  const allowed = new Set<string>();
  for (const key of enabled) {
    for (const urlKey of URL_KEY_BY_FILTER[key]) {
      allowed.add(urlKey);
    }
  }
  const out: Record<string, string> = {};
  for (const [urlKey, value] of Object.entries(params)) {
    if (!allowed.has(urlKey)) continue;
    if (value === undefined || value === null || String(value).trim() === "") continue;
    out[urlKey] = String(value).trim();
  }
  if (allowed.has("range_preset") && !out.range_preset) {
    out.range_preset = "last_7_days";
  }
  return out;
}

export function defaultReportSearchParams(enabled: ReportFilterKey[]): URLSearchParams {
  const next = new URLSearchParams();
  if (enabled.includes("dateRange")) {
    next.set("range_preset", "last_7_days");
  }
  if (enabled.includes("granularity")) {
    next.set("granularity", "day");
  }
  return next;
}
