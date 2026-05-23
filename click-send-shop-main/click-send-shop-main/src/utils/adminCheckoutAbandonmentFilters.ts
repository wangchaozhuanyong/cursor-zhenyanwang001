import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import type { CheckoutAbandonmentStatus } from "@/types/order";

export type CheckoutAbandonmentFilterState = {
  keyword: string;
  status: "" | CheckoutAbandonmentStatus;
};

const STATUS_LABELS: Record<CheckoutAbandonmentStatus, string> = {
  open: "仅进入结算",
  ordered: "已下单未支付",
  paid: "已支付",
  closed: "已关闭",
};

export const CHECKOUT_ABANDONMENT_DEFAULT_STATUS_LABEL = "待处理";

export function hasActiveCheckoutAbandonmentFilters(state: CheckoutAbandonmentFilterState): boolean {
  return Boolean(state.keyword.trim() || state.status);
}

export function buildCheckoutAbandonmentFilterChips(state: CheckoutAbandonmentFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.status) chips.push({ key: "status", label: `状态：${STATUS_LABELS[state.status] || state.status}` });
  return chips;
}

export function removeCheckoutAbandonmentFilterChip(key: string): Partial<CheckoutAbandonmentFilterState> {
  switch (key) {
    case "keyword":
      return { keyword: "" };
    case "status":
      return { status: "" };
    default:
      return {};
  }
}
