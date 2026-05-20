import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

export type InviteRecordFilterState = {
  search: string;
};

export function hasActiveInviteRecordFilters(state: InviteRecordFilterState): boolean {
  return Boolean(state.search.trim());
}

export function buildInviteRecordFilterChips(state: InviteRecordFilterState): AdminFilterChip[] {
  if (!state.search.trim()) return [];
  return [{ key: "search", label: `关键词：${state.search.trim()}` }];
}

export function removeInviteRecordFilterChip(key: string): Partial<InviteRecordFilterState> {
  if (key === "search") return { search: "" };
  return {};
}
