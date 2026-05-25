import type { CheckoutAbandonment } from "@/types/order";

export function getCheckoutAbandonmentRecordTypeLabel(
  row: Pick<CheckoutAbandonment, "display_type">,
): string {
  return row.display_type === "order" ? "订单" : "快照";
}

export function formatCheckoutAbandonmentNumber(
  row: Pick<CheckoutAbandonment, "display_type" | "display_id" | "order_no">,
): string {
  if (row.display_type === "order") {
    return `#${row.order_no || row.display_id}`;
  }
  return `#${row.display_id}`;
}

/** @deprecated 合并展示用；表格已拆为「记录类型 + 编号」两列 */
export function formatCheckoutAbandonmentDisplayLabel(row: Pick<CheckoutAbandonment, "display_type" | "display_id" | "order_no">): string {
  const typeLabel = getCheckoutAbandonmentRecordTypeLabel(row);
  return `${typeLabel} ${formatCheckoutAbandonmentNumber(row)}`;
}

export function getCheckoutAbandonmentActionLabel(row: Pick<CheckoutAbandonment, "action_type" | "order_id">): string {
  if (row.action_type === "view_order" || row.order_id) return "查看订单";
  return "仅记录";
}

export function formatMergedSnapshotsLabel(snapshotCount: number): string | null {
  if (snapshotCount <= 1) return null;
  return `已合并 ${snapshotCount} 条快照`;
}

export function itemsSummaryFullText(row: Pick<CheckoutAbandonment, "items_summary">): string {
  return row.items_summary.map((item) => `${item.name || "未命名商品"} x${item.qty}`).join("\n") || "无商品摘要";
}
