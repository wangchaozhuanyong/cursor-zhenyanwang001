import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import type { InventoryChangeType } from "@/types/inventory";

const STOCK_STATUS_LABELS: Record<string, string> = {
  normal: "正常",
  low: "低库存",
  out: "缺货",
};

const CHANGE_TYPE_LABELS: Record<InventoryChangeType, string> = {
  in: "入库",
  out: "出库",
  adjust: "盘点调整",
  order_deduct: "订单扣减",
  order_release: "订单释放",
};

export type InventorySkuFilterState = {
  keyword: string;
  stockStatus: "" | "normal" | "low" | "out";
};

export type InventoryRecordFilterState = {
  keyword: string;
  changeType: string;
};

export function hasActiveInventorySkuFilters(state: InventorySkuFilterState): boolean {
  return Boolean(state.keyword.trim() || state.stockStatus);
}

export function buildInventorySkuFilterChips(state: InventorySkuFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.stockStatus) {
    chips.push({ key: "stockStatus", label: `库存：${STOCK_STATUS_LABELS[state.stockStatus] || state.stockStatus}` });
  }
  return chips;
}

export function removeInventorySkuFilterChip(key: string): Partial<InventorySkuFilterState> {
  switch (key) {
    case "keyword":
      return { keyword: "" };
    case "stockStatus":
      return { stockStatus: "" };
    default:
      return {};
  }
}

export function hasActiveInventoryRecordFilters(state: InventoryRecordFilterState): boolean {
  return Boolean(state.keyword.trim() || state.changeType);
}

export function buildInventoryRecordFilterChips(state: InventoryRecordFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.changeType) {
    const label = CHANGE_TYPE_LABELS[state.changeType as InventoryChangeType] || state.changeType;
    chips.push({ key: "changeType", label: `类型：${label}` });
  }
  return chips;
}

export function removeInventoryRecordFilterChip(key: string): Partial<InventoryRecordFilterState> {
  switch (key) {
    case "keyword":
      return { keyword: "" };
    case "changeType":
      return { changeType: "" };
    default:
      return {};
  }
}
