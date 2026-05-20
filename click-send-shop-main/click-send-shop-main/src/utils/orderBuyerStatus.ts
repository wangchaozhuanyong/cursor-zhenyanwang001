import type { Order, OrderTab } from "@/types/order";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/constants/statusDictionary";

/** 与后端 orderStateMachine.canUserCancel 一致 */
export function canUserCancelOrder(order: Order): boolean {
  return order.status === ORDER_STATUS.PENDING
    && (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PAID;
}

export function isPendingPayment(order: Order): boolean {
  return order.status === ORDER_STATUS.PENDING
    && (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PAID;
}

/** 与后端 return.service createReturn 一致 */
export function canApplyAfterSale(order: Order): boolean {
  return order.status === ORDER_STATUS.SHIPPED || order.status === ORDER_STATUS.COMPLETED;
}

/** 与后端 orderAfterSale / tab=after_sale 列表口径一致 */
export function orderInAfterSaleTab(order: Order): boolean {
  return order.status === ORDER_STATUS.REFUNDING
    || order.status === ORDER_STATUS.REFUNDED
    || Number(order.return_request_count || 0) > 0;
}

export function hasPendingReview(order: Order): boolean {
  return order.status === "completed" && order.items.some((i) => i.can_review);
}

export function getBuyerOrderStatusText(order: Order): string {
  if (order.status === "refunding") return "退款/售后处理中";
  if (order.status === "refunded") return "已退款";
  if (Number(order.active_return_count || 0) > 0) return "售后处理中";
  if (order.status === "pending") return "待付款";
  if (order.status === "paid") return "已付款，等待商家发货";
  if (order.status === "shipped") return "已发货，等待收货";
  if (order.status === "completed") return hasPendingReview(order) ? "待评价" : "已完成";
  if (Number(order.return_request_count || 0) > 0) return "售后已结案";
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
  if (tab === "after_sale") return orderInAfterSaleTab(order);
  if (tab === "cancelled") return order.status === "cancelled";
  return true;
}

export function getOrderProgressStep(order: Order): number {
  if (order.status === "pending") return 0;
  if (order.status === "paid") return 1;
  if (order.status === "shipped") return 2;
  return 3;
}
