import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import type { RewardStatus } from "@/types/reward";

const STATUS_LABELS: Record<string, string> = {
  approved: "已入账",
  paid: "已提现",
  reversed: "已冲正",
  pending: "待处理",
  rejected: "已拒绝",
};

export type RewardRecordFilterState = {
  keyword: string;
  status: "" | RewardStatus;
};

export function hasActiveRewardRecordFilters(state: RewardRecordFilterState): boolean {
  return Boolean(state.keyword.trim() || state.status);
}

export function buildRewardRecordFilterChips(state: RewardRecordFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.status) chips.push({ key: "status", label: `状态：${STATUS_LABELS[state.status] || state.status}` });
  return chips;
}

export function removeRewardRecordFilterChip(key: string): Partial<RewardRecordFilterState> {
  switch (key) {
    case "keyword":
      return { keyword: "" };
    case "status":
      return { status: "" };
    default:
      return {};
  }
}
