import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

const TYPE_LABELS: Record<string, string> = {
  products: "商品",
  categories: "分类",
  coupons: "优惠券",
  banners: "Banner",
  content_pages: "内容页",
  product_reviews: "评论",
};

export type RecycleBinFilterState = {
  typeFilter: string;
};

export function hasActiveRecycleBinFilters(state: RecycleBinFilterState): boolean {
  return Boolean(state.typeFilter);
}

export function buildRecycleBinFilterChips(state: RecycleBinFilterState): AdminFilterChip[] {
  if (!state.typeFilter) return [];
  return [{ key: "type", label: `类型：${TYPE_LABELS[state.typeFilter] || state.typeFilter}` }];
}

export function removeRecycleBinFilterChip(key: string): Partial<RecycleBinFilterState> {
  if (key === "type") return { typeFilter: "" };
  return {};
}
