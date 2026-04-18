import { get, post } from "../request";
import type { Order, SubmitOrderParams, OrderListParams } from "@/types/order";
import type { PaginatedData } from "@/types/common";

export function getOrders(params?: OrderListParams) {
  return get<PaginatedData<Order>>("/orders", params as Record<string, unknown>);
}

export function getOrderById(id: string) {
  return get<Order>(`/orders/${id}`);
}

export function submitOrder(params: SubmitOrderParams) {
  return post<Order>("/orders", params);
}

export function cancelOrder(id: string) {
  return post<void>(`/orders/${id}/cancel`);
}

export function confirmReceive(id: string) {
  return post<void>(`/orders/${id}/confirm`);
}

/** 在线支付（当前为模拟渠道 mock，可替换为真实支付回调） */
export function payOrder(id: string, body?: { channel?: "mock" }) {
  return post<Order>(`/orders/${id}/pay`, body ?? { channel: "mock" });
}

/** Stripe Checkout：返回跳转 URL */
export function createStripeCheckoutSession(id: string) {
  return post<{ url: string }>(`/orders/${id}/stripe-checkout`);
}
