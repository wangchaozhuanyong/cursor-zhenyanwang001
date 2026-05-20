import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { labelProvider } from "@/utils/paymentAdminLabels";

export type PaymentOrderFilterState = {
  status: string;
  keyword: string;
};

export type PaymentEventFilterState = {
  provider: string;
  orderId: string;
};

const PAYMENT_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "待支付",
  paid: "已支付",
};

export function hasActivePaymentOrderFilters(state: PaymentOrderFilterState): boolean {
  return Boolean(state.status || state.keyword.trim());
}

export function buildPaymentOrderFilterChips(state: PaymentOrderFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.status) {
    chips.push({ key: "status", label: `状态：${PAYMENT_ORDER_STATUS_LABELS[state.status] || state.status}` });
  }
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  return chips;
}

export function removePaymentOrderFilterChip(key: string): Partial<PaymentOrderFilterState> {
  switch (key) {
    case "status":
      return { status: "" };
    case "keyword":
      return { keyword: "" };
    default:
      return {};
  }
}

export function hasActivePaymentEventFilters(state: PaymentEventFilterState): boolean {
  return Boolean(state.provider.trim() || state.orderId.trim());
}

export function buildPaymentEventFilterChips(state: PaymentEventFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.provider.trim()) {
    chips.push({ key: "provider", label: `网关：${labelProvider(state.provider.trim())}` });
  }
  if (state.orderId.trim()) chips.push({ key: "orderId", label: `订单：${state.orderId.trim()}` });
  return chips;
}

export function removePaymentEventFilterChip(key: string): Partial<PaymentEventFilterState> {
  switch (key) {
    case "provider":
      return { provider: "" };
    case "orderId":
      return { orderId: "" };
    default:
      return {};
  }
}
