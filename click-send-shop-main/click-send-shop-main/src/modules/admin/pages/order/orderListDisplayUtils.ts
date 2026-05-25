import type { Order } from "@/types/order";

export function money(value: unknown): string {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export function shortId(value?: string): string {
  const raw = String(value || "");
  return raw ? raw.slice(-6) : "-";
}

export function getFirstItemSummary(items: Order["items"] | undefined, tText: (zh: string) => string): string {
  const first = items?.[0];
  if (!first) return "-";
  const name = first.product?.name || tText("商品");
  const suffix = items && items.length > 1 ? tText(`，另 ${items.length - 1} 件`) : "";
  return `${name} ×${first.qty}${suffix}`;
}

export function buildOrderBadges(order: Order, tText: (zh: string) => string): string[] {
  if (Array.isArray(order.risk_badges) && order.risk_badges.length) {
    return order.risk_badges.map((badge) => tText(badge));
  }
  const badges: string[] = [];
  if (order.note) badges.push(tText("买家备注"));
  if ((order.active_return_count || 0) > 0) badges.push(tText("售后中"));
  if (Number(order.refund_amount || 0) > 0) badges.push(tText("有退款"));
  if (order.cost_snapshot_source === "missing" || Number(order.missing_cost_item_count || 0) > 0) badges.push(tText("缺成本"));
  if (Number(order.total_amount || 0) >= 500) badges.push(tText("高金额"));
  return badges;
}

export function afterSaleLabel(order: Order, tText: (zh: string) => string): { text: string; className: string } {
  if ((order.active_return_count || 0) > 0) return { text: tText("售后中"), className: "bg-amber-100 text-amber-700" };
  if (Number(order.refund_amount || 0) > 0 || order.payment_status === "refunded") return { text: tText("已退款"), className: "bg-red-100 text-red-700" };
  if (order.payment_status === "partially_refunded") return { text: tText("部分退款"), className: "bg-orange-100 text-orange-700" };
  return { text: tText("无售后"), className: "bg-slate-100 text-slate-600" };
}
