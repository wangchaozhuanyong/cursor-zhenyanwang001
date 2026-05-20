import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

export type CouponRecordFilterState = {
  search: string;
  statusFilter: string;
};

const STATUS_LABELS: Record<string, string> = {
  available: "未使用",
  used: "已使用",
  expired: "已过期",
};

export function hasActiveCouponRecordFilters(state: CouponRecordFilterState): boolean {
  return Boolean(state.search.trim() || state.statusFilter);
}

export function buildCouponRecordFilterChips(state: CouponRecordFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.search.trim()) chips.push({ key: "search", label: `关键词：${state.search.trim()}` });
  if (state.statusFilter) {
    chips.push({ key: "status", label: `状态：${STATUS_LABELS[state.statusFilter] || state.statusFilter}` });
  }
  return chips;
}

export function removeCouponRecordFilterChip(key: string): Partial<CouponRecordFilterState> {
  switch (key) {
    case "search":
      return { search: "" };
    case "status":
      return { statusFilter: "" };
    default:
      return {};
  }
}
