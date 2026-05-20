import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

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

const COMPARE_LABELS: Record<string, string> = {
  previous_period: "对比上周期",
  previous_week: "对比上周",
  previous_month: "对比上月",
};

export function hasActiveReportFilters(params: URLSearchParams): boolean {
  const keys = [
    "range_preset",
    "granularity",
    "compare",
    "date_from",
    "date_to",
    "category_id",
    "product_id",
    "activity_id",
    "coupon_id",
    "order_status",
    "payment_status",
    "payment_method",
    "user_type",
  ];
  return keys.some((key) => {
    const value = params.get(key);
    if (!value) return false;
    if (key === "range_preset" && value === "last_7_days") return false;
    if (key === "granularity" && value === "day") return false;
    return true;
  });
}

export function buildReportFilterChips(params: URLSearchParams): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  const range = params.get("range_preset");
  if (range && range !== "last_7_days") {
    chips.push({ key: "range_preset", label: `时间：${RANGE_LABELS[range] || range}` });
  }
  const granularity = params.get("granularity");
  if (granularity && granularity !== "day") {
    chips.push({ key: "granularity", label: GRANULARITY_LABELS[granularity] || granularity });
  }
  const compare = params.get("compare");
  if (compare) chips.push({ key: "compare", label: COMPARE_LABELS[compare] || compare });
  const dateFrom = params.get("date_from");
  if (dateFrom) chips.push({ key: "date_from", label: `开始：${dateFrom}` });
  const dateTo = params.get("date_to");
  if (dateTo) chips.push({ key: "date_to", label: `结束：${dateTo}` });
  if (params.get("category_id")) chips.push({ key: "category_id", label: "已选分类" });
  if (params.get("product_id")) chips.push({ key: "product_id", label: "已选商品" });
  if (params.get("activity_id")) chips.push({ key: "activity_id", label: "已选活动" });
  if (params.get("coupon_id")) chips.push({ key: "coupon_id", label: "已选优惠券" });
  if (params.get("order_status")) chips.push({ key: "order_status", label: `订单：${params.get("order_status")}` });
  if (params.get("payment_status")) chips.push({ key: "payment_status", label: `支付：${params.get("payment_status")}` });
  if (params.get("payment_method")) chips.push({ key: "payment_method", label: `方式：${params.get("payment_method")}` });
  if (params.get("user_type")) chips.push({ key: "user_type", label: `用户：${params.get("user_type")}` });
  return chips;
}

export function removeReportFilterChip(
  params: URLSearchParams,
  key: string,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const defaults: Record<string, string | null> = {
    range_preset: "last_7_days",
    granularity: "day",
    compare: null,
    date_from: null,
    date_to: null,
    category_id: null,
    product_id: null,
    activity_id: null,
    coupon_id: null,
    order_status: null,
    payment_status: null,
    payment_method: null,
    user_type: null,
  };
  const fallback = defaults[key];
  if (fallback === null || fallback === undefined) next.delete(key);
  else next.set(key, fallback);
  return next;
}

export function clearReportFilters(): URLSearchParams {
  return new URLSearchParams({ range_preset: "last_7_days", granularity: "day" });
}
