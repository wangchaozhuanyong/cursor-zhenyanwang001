import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import type { PointsAction } from "@/types/points";

const ACTION_LABELS: Record<string, string> = {
  order_earn: "订单奖励",
  order_reverse: "订单回滚",
  sign_in: "每日签到",
  admin_add: "管理员增加",
  admin_deduct: "管理员扣减",
  redeem: "积分抵扣",
};

export type PointsRecordFilterState = {
  keyword: string;
  action: "" | PointsAction;
};

export function hasActivePointsRecordFilters(state: PointsRecordFilterState): boolean {
  return Boolean(state.keyword.trim() || state.action);
}

export function buildPointsRecordFilterChips(state: PointsRecordFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.action) chips.push({ key: "action", label: `类型：${ACTION_LABELS[state.action] || state.action}` });
  return chips;
}

export function removePointsRecordFilterChip(key: string): Partial<PointsRecordFilterState> {
  switch (key) {
    case "keyword":
      return { keyword: "" };
    case "action":
      return { action: "" };
    default:
      return {};
  }
}
