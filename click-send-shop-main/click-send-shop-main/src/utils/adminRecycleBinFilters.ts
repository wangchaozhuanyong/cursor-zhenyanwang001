import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { labelRecycleType, RECYCLE_TYPE_LABELS } from "@/utils/adminDisplayLabels";

export type RecycleBinFilterState = {
  typeFilter: string;
};

export function hasActiveRecycleBinFilters(state: RecycleBinFilterState): boolean {
  return Boolean(state.typeFilter);
}

export function buildRecycleBinFilterChips(state: RecycleBinFilterState): AdminFilterChip[] {
  if (!state.typeFilter) return [];
  return [{ key: "type", label: `类型：${labelRecycleType(state.typeFilter, RECYCLE_TYPE_LABELS[state.typeFilter])}` }];
}

export function removeRecycleBinFilterChip(key: string): Partial<RecycleBinFilterState> {
  if (key === "type") return { typeFilter: "" };
  return {};
}
