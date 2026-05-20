import type { Order, OrderTab } from "@/types/order";

export function hasPendingReview(order: Order): boolean {
  return order.status === "completed" && order.items.some((i) => i.can_review);
}

export function getBuyerOrderStatusText(order: Order): string {
  if (order.status === "pending") return "待付款";
  if (order.status === "paid") return "已付款，等待商家发货";
  if (order.status === "shipped") return "已发货，等待收货";
  if (order.status === "completed") return hasPendingReview(order) ? "待评价" : "已完成";
  if (order.status === "refunding") return "退款/售后处理中";
  if (order.status === "refunded") return "已退款";
  if (order.status === "cancelled") return "已取消";
  return order.status;
}

export function matchOrderTab(order: Order, tab: OrderTab): boolean {
  if (tab === "all") return true;
  if (tab === "pending_payment") return order.status === "pending" && order.payment_status !== "paid";
  if (tab === "paid") return order.status === "paid";
  if (tab === "shipped") return order.status === "shipped";
  if (tab === "pending_review") return hasPendingReview(order);
  if (tab === "completed") return order.status === "completed" && !hasPendingReview(order);
  if (tab === "after_sale") return order.status === "refunding" || order.status === "refunded";
  if (tab === "cancelled") return order.status === "cancelled";
  return true;
}

export function getOrderProgressStep(order: Order): number {
  if (order.status === "pending") return 0;
  if (order.status === "paid") return 1;
  if (order.status === "shipped") return 2;
  return 3;
}
