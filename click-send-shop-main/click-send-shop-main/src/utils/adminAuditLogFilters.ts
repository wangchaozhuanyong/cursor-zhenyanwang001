import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

export type AuditLogFilterState = {
  keyword: string;
  result: "" | "success" | "failure";
  dateFrom: string;
  dateTo: string;
};

const RESULT_LABELS: Record<string, string> = {
  success: "成功",
  failure: "失败",
};

export function hasActiveAuditLogFilters(state: AuditLogFilterState): boolean {
  return Boolean(state.keyword.trim() || state.result || state.dateFrom || state.dateTo);
}

export function buildAuditLogFilterChips(state: AuditLogFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.result) chips.push({ key: "result", label: `结果：${RESULT_LABELS[state.result] || state.result}` });
  if (state.dateFrom) chips.push({ key: "dateFrom", label: `开始：${state.dateFrom}` });
  if (state.dateTo) chips.push({ key: "dateTo", label: `结束：${state.dateTo}` });
  return chips;
}

export function removeAuditLogFilterChip(key: string): Partial<AuditLogFilterState> {
  switch (key) {
    case "keyword":
      return { keyword: "" };
    case "result":
      return { result: "" };
    case "dateFrom":
      return { dateFrom: "" };
    case "dateTo":
      return { dateTo: "" };
    default:
      return {};
  }
}
