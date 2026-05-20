import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import type { ActivityStatus, ActivityType } from "@/types/activity";
import { labelActivityType } from "@/utils/adminDisplayLabels";

const STATUS_TAB_LABELS: Record<string, string> = {
  active: "进行中",
  scheduled: "未开始",
  ended: "已结束",
  disabled: "已禁用",
};

export type ActivityFilterState = {
  keyword: string;
  type: ActivityType | "";
  status: ActivityStatus | "";
};

export function hasActiveActivityFilters(state: ActivityFilterState): boolean {
  return Boolean(state.keyword.trim() || state.type || state.status);
}

export function buildActivityFilterChips(state: ActivityFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.type) chips.push({ key: "type", label: `类型：${labelActivityType(state.type)}` });
  if (state.status) {
    chips.push({ key: "status", label: `状态：${STATUS_TAB_LABELS[state.status] || state.status}` });
  }
  return chips;
}

export function removeActivityFilterChip(
  key: string,
): Partial<ActivityFilterState> {
  switch (key) {
    case "keyword":
      return { keyword: "" };
    case "type":
      return { type: "" };
    case "status":
      return { status: "" };
    default:
      return {};
  }
}
