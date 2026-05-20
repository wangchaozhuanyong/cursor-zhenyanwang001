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
  unpack_parent_out: "拆包-大包装减少",
  unpack_child_in: "拆包-小包装增加",
  assemble_child_out: "组装-小包装减少",
  assemble_parent_in: "组装-大包装增加",
  auto_unpack_parent_out: "自动拆包-大包装减少",
  auto_unpack_child_in: "自动拆包-小包装增加",
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
  if (state.stockStatus) chips.push({ key: "stockStatus", label: `库存：${STOCK_STATUS_LABELS[state.stockStatus] || state.stockStatus}` });
  return chips;
}

export function removeInventorySkuFilterChip(key: string): Partial<InventorySkuFilterState> {
  if (key === "keyword") return { keyword: "" };
  if (key === "stockStatus") return { stockStatus: "" };
  return {};
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
  if (key === "keyword") return { keyword: "" };
  if (key === "changeType") return { changeType: "" };
  return {};
}
