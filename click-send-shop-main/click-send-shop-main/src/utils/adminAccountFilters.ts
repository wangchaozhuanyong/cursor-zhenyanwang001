import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

export type AdminAccountFilterState = {
  search: string;
};

export function hasActiveAdminAccountFilters(state: AdminAccountFilterState): boolean {
  return Boolean(state.search.trim());
}

export function buildAdminAccountFilterChips(state: AdminAccountFilterState): AdminFilterChip[] {
  if (!state.search.trim()) return [];
  return [{ key: "search", label: `关键词：${state.search.trim()}` }];
}

export function removeAdminAccountFilterChip(key: string): Partial<AdminAccountFilterState> {
  if (key === "search") return { search: "" };
  return {};
}
