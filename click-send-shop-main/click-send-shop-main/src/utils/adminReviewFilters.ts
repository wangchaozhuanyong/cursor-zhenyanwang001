import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

export type ReviewFilterState = {
  keyword: string;
  status: string;
  rating: number;
  complaintStatus: string;
  userId: string;
  productId: string;
  dateFrom: string;
  dateTo: string;
  verifiedOnly: string;
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
    || state.complaintStatus
    || state.userId.trim()
    || state.productId.trim()
    || state.dateFrom.trim()
    || state.dateTo.trim()
    || state.verifiedOnly,
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
  if (state.userId.trim()) chips.push({ key: "userId", label: `用户ID：${state.userId.trim()}` });
  if (state.productId.trim()) chips.push({ key: "productId", label: `商品ID：${state.productId.trim()}` });
  if (state.dateFrom.trim()) chips.push({ key: "dateFrom", label: `开始：${state.dateFrom.trim()}` });
  if (state.dateTo.trim()) chips.push({ key: "dateTo", label: `结束：${state.dateTo.trim()}` });
  if (state.verifiedOnly === "1") chips.push({ key: "verifiedOnly", label: "仅已购评价" });
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
    case "userId":
      return { userId: "" };
    case "productId":
      return { productId: "" };
    case "dateFrom":
      return { dateFrom: "" };
    case "dateTo":
      return { dateTo: "" };
    case "verifiedOnly":
      return { verifiedOnly: "" };
    default:
      return {};
  }
}
