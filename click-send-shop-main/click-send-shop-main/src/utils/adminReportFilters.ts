import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import type { ReportFilterKey } from "@/utils/reportFilters";
import { defaultReportSearchParams } from "@/utils/reportFilters";

const RANGE_LABELS: Record<string, string> = {
  today: "今日",
  yesterday: "昨日",
  last_7_days: "最近7天",
  last_30_days: "最近30天",
  this_month: "本月",
  last_month: "上月",
  this_quarter: "本季度",
  custom: "自定义",
};

const GRANULARITY_LABELS: Record<string, string> = {
  day: "按日",
  week: "按周",
  month: "按月",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "待付款",
  paid: "已支付",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
  refunded: "已退款",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "未支付",
  paid: "已支付",
  partially_refunded: "部分退款",
  refunded: "已全额退款",
  pending: "待支付",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  fpx: "FPX",
  card: "银行卡",
  wallet: "电子钱包",
  cod: "货到付款",
  wechat: "微信",
  alipay: "支付宝",
  reward_wallet: "奖励钱包",
};

const CHIP_KEYS_BY_FILTER: Record<ReportFilterKey, string[]> = {
  dateRange: ["range_preset", "date_from", "date_to"],
  granularity: ["granularity"],
  categoryId: ["category_id"],
  productId: ["product_id"],
  activityId: ["activity_id"],
  couponId: ["coupon_id"],
  orderStatus: ["order_status"],
  paymentStatus: ["payment_status"],
  paymentMethod: ["payment_method"],
};

function enabledUrlKeys(enabled: ReportFilterKey[]): Set<string> {
  const keys = new Set<string>();
  for (const filter of enabled) {
    for (const urlKey of CHIP_KEYS_BY_FILTER[filter]) {
      keys.add(urlKey);
    }
  }
  return keys;
}

export function hasActiveReportFilters(
  params: URLSearchParams,
  enabled: ReportFilterKey[],
): boolean {
  const allowed = enabledUrlKeys(enabled);
  return [...allowed].some((key) => {
    const value = params.get(key);
    if (!value) return false;
    if (key === "range_preset" && value === "last_7_days") return false;
    if (key === "granularity" && value === "day") return false;
    return true;
  });
}

export function buildReportFilterChips(
  params: URLSearchParams,
  enabled: ReportFilterKey[],
): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  const allowed = enabledUrlKeys(enabled);

  if (allowed.has("range_preset")) {
    const range = params.get("range_preset");
    if (range && range !== "last_7_days") {
      chips.push({ key: "range_preset", label: `时间：${RANGE_LABELS[range] || range}` });
    }
  }
  if (allowed.has("granularity")) {
    const granularity = params.get("granularity");
    if (granularity && granularity !== "day") {
      chips.push({ key: "granularity", label: GRANULARITY_LABELS[granularity] || granularity });
    }
  }
  if (allowed.has("date_from")) {
    const dateFrom = params.get("date_from");
    if (dateFrom) chips.push({ key: "date_from", label: `开始：${dateFrom}` });
  }
  if (allowed.has("date_to")) {
    const dateTo = params.get("date_to");
    if (dateTo) chips.push({ key: "date_to", label: `结束：${dateTo}` });
  }
  if (allowed.has("category_id") && params.get("category_id")) {
    chips.push({ key: "category_id", label: "已选分类" });
  }
  if (allowed.has("product_id") && params.get("product_id")) {
    chips.push({ key: "product_id", label: `商品：${params.get("product_id")}` });
  }
  if (allowed.has("activity_id") && params.get("activity_id")) {
    chips.push({ key: "activity_id", label: `活动：${params.get("activity_id")}` });
  }
  if (allowed.has("coupon_id") && params.get("coupon_id")) {
    chips.push({ key: "coupon_id", label: `优惠券：${params.get("coupon_id")}` });
  }
  if (allowed.has("order_status") && params.get("order_status")) {
    const v = params.get("order_status") || "";
    chips.push({ key: "order_status", label: `订单：${ORDER_STATUS_LABELS[v] || v}` });
  }
  if (allowed.has("payment_status") && params.get("payment_status")) {
    const v = params.get("payment_status") || "";
    chips.push({ key: "payment_status", label: `支付：${PAYMENT_STATUS_LABELS[v] || v}` });
  }
  if (allowed.has("payment_method") && params.get("payment_method")) {
    const v = params.get("payment_method") || "";
    chips.push({ key: "payment_method", label: `方式：${PAYMENT_METHOD_LABELS[v] || v}` });
  }
  return chips;
}

export function removeReportFilterChip(
  params: URLSearchParams,
  key: string,
  enabled: ReportFilterKey[],
): URLSearchParams {
  const next = new URLSearchParams(params);
  const defaults: Record<string, string | null> = {
    range_preset: "last_7_days",
    granularity: "day",
    date_from: null,
    date_to: null,
    category_id: null,
    product_id: null,
    activity_id: null,
    coupon_id: null,
    order_status: null,
    payment_status: null,
    payment_method: null,
  };
  const fallback = defaults[key];
  if (fallback === null || fallback === undefined) next.delete(key);
  else next.set(key, fallback);
  return sanitizeReportChipParams(next, enabled);
}

export function clearReportFilters(enabled: ReportFilterKey[]): URLSearchParams {
  return defaultReportSearchParams(enabled);
}

/** 清除不在 enabled 内的参数（与 sanitizeReportSearchParams 一致，供 chip 操作复用） */
function sanitizeReportChipParams(
  params: URLSearchParams,
  enabled: ReportFilterKey[],
): URLSearchParams {
  const allowed = enabledUrlKeys(enabled);
  const next = new URLSearchParams();
  params.forEach((value, urlKey) => {
    if (allowed.has(urlKey)) next.set(urlKey, value);
  });
  if (allowed.has("range_preset") && !next.has("range_preset")) {
    next.set("range_preset", "last_7_days");
  }
  if (enabled.includes("granularity") && !next.has("granularity")) {
    next.set("granularity", "day");
  }
  return next;
}
