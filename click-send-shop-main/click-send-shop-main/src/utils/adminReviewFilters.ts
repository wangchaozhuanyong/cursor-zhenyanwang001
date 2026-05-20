import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

export type ReviewFilterState = {
  keyword: string;
  status: string;
  rating: number;
  complaintStatus: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待审核",
  normal: "正常",
  hidden: "已隐藏",
  rejected: "已拒绝",
  deleted: "已删除",
};

const COMPLAINT_LABELS: Record<string, string> = {
  pending: "未处理",
  in_progress: "处理中",
  contacted: "已联系",
  resolved: "已解决",
  dismissed: "无需处理",
};

export function hasActiveReviewFilters(state: ReviewFilterState): boolean {
  return Boolean(
    state.keyword.trim()
    || state.status
    || state.rating > 0
    || state.complaintStatus,
  );
}

export function buildReviewFilterChips(state: ReviewFilterState): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.keyword.trim()) chips.push({ key: "keyword", label: `关键词：${state.keyword.trim()}` });
  if (state.status) chips.push({ key: "status", label: `状态：${STATUS_LABELS[state.status] || state.status}` });
  if (state.rating > 0) chips.push({ key: "rating", label: `星级：${state.rating} 星` });
  if (state.complaintStatus) {
    chips.push({ key: "complaint", label: `差评：${COMPLAINT_LABELS[state.complaintStatus] || state.complaintStatus}` });
  }
  return chips;
}

export function removeReviewFilterChip(key: string): Partial<ReviewFilterState> {
  switch (key) {
    case "keyword":
      return { keyword: "" };
    case "status":
      return { status: "" };
    case "rating":
      return { rating: 0 };
    case "complaint":
      return { complaintStatus: "" };
    default:
      return {};
  }
}
