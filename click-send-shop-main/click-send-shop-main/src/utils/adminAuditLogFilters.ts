import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { zhActionType, zhObjectType } from "@/utils/auditLogI18n";

export type AuditLogFilterState = {
  keyword: string;
  result: "" | "success" | "failure";
  dateFrom: string;
  dateTo: string;
  operatorId?: string;
  objectType?: string;
  objectId?: string;
  actionType?: string;
};

const RESULT_LABELS: Record<string, string> = {
  success: "成功",
  failure: "失败",
};

export function hasActiveAuditLogFilters(state: AuditLogFilterState): boolean {
  return Boolean(
    state.keyword.trim()
    || state.result
    || state.dateFrom
    || state.dateTo
    || state.operatorId?.trim()
    || state.objectType?.trim()
    || state.objectId?.trim()
    || state.actionType?.trim(),
  );
}

export function buildAuditLogFilterChips(state: AuditLogFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.result) chips.push({ key: "result", label: `结果：${RESULT_LABELS[state.result] || state.result}` });
  if (state.dateFrom) chips.push({ key: "dateFrom", label: `开始：${state.dateFrom}` });
  if (state.dateTo) chips.push({ key: "dateTo", label: `结束：${state.dateTo}` });
  if (state.operatorId?.trim()) chips.push({ key: "operatorId", label: `操作人编号：${state.operatorId.trim()}` });
  if (state.objectType?.trim()) chips.push({ key: "objectType", label: `对象类型：${zhObjectType(state.objectType)}` });
  if (state.objectId?.trim()) chips.push({ key: "objectId", label: `对象编号：${state.objectId.trim()}` });
  if (state.actionType?.trim()) chips.push({ key: "actionType", label: `动作：${zhActionType(state.actionType)}` });
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
    case "operatorId":
      return { operatorId: "" };
    case "objectType":
      return { objectType: "" };
    case "objectId":
      return { objectId: "" };
    case "actionType":
      return { actionType: "" };
    default:
      return {};
  }
}
