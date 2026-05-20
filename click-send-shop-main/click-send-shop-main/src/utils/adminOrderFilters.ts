import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import {
  ORDER_STATUS_FILTER_OPTIONS,
  PAYMENT_STATUS_FILTER_OPTIONS,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "@/constants/statusDictionary";
import type { PaymentStatus } from "@/types/order";

type OrderFilterState = {
  statusFilter: string;
  paymentFilter: "" | PaymentStatus;
  search: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
  paymentChannel: string;
  shippingName: string;
  amountMin: string;
  amountMax: string;
};

export function hasActiveOrderFilters(state: OrderFilterState): boolean {
  return Boolean(
    state.statusFilter
    || state.paymentFilter
    || state.search.trim()
    || state.dateFrom
    || state.dateTo
    || state.paymentMethod.trim()
    || state.paymentChannel.trim()
    || state.shippingName.trim()
    || state.amountMin.trim()
    || state.amountMax.trim(),
  );
}

export function buildOrderFilterChips(state: OrderFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.search.trim()) chips.push({ key: "search", label: `关键词：${state.search.trim()}` });
  if (state.statusFilter) {
    const label = ORDER_STATUS_FILTER_OPTIONS.find((o) => o.value === state.statusFilter)?.label
      ?? getOrderStatusLabel(state.statusFilter as never);
    chips.push({ key: "status", label: `履约：${label}` });
  }
  if (state.paymentFilter) {
    chips.push({
      key: "payment",
      label: `支付：${getPaymentStatusLabel(state.paymentFilter)}`,
    });
  }
  if (state.dateFrom) chips.push({ key: "dateFrom", label: `开始：${state.dateFrom}` });
  if (state.dateTo) chips.push({ key: "dateTo", label: `结束：${state.dateTo}` });
  if (state.amountMin.trim()) chips.push({ key: "amountMin", label: `最低 RM ${state.amountMin}` });
  if (state.amountMax.trim()) chips.push({ key: "amountMax", label: `最高 RM ${state.amountMax}` });
  if (state.paymentMethod.trim()) chips.push({ key: "paymentMethod", label: `支付：${state.paymentMethod.trim()}` });
  if (state.paymentChannel.trim()) chips.push({ key: "paymentChannel", label: `渠道：${state.paymentChannel.trim()}` });
  if (state.shippingName.trim()) chips.push({ key: "shipping", label: `配送：${state.shippingName.trim()}` });
  return chips;
}

export function removeOrderFilterChip(
  state: OrderFilterState,
  key: string,
): Partial<OrderFilterState> {
  switch (key) {
    case "search":
      return { search: "" };
    case "status":
      return { statusFilter: "" };
    case "payment":
      return { paymentFilter: "" };
    case "dateFrom":
      return { dateFrom: "" };
    case "dateTo":
      return { dateTo: "" };
    case "amountMin":
      return { amountMin: "" };
    case "amountMax":
      return { amountMax: "" };
    case "paymentMethod":
      return { paymentMethod: "" };
    case "paymentChannel":
      return { paymentChannel: "" };
    case "shipping":
      return { shippingName: "" };
    default:
      return {};
  }
}
