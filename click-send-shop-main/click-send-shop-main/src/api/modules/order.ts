import { get, post } from "@/api/request";
import type { Order, SubmitOrderParams, OrderListParams, CheckoutAbandonmentPayload } from "@/types/order";
import type { OrderPreviewResult } from "@/types/orderPreview";
import type { PaginatedData } from "@/types/common";
import type { OrderSummary } from "@/types/order";

export function getOrders(params?: OrderListParams) {
  return get<PaginatedData<Order>>("/orders", params as unknown as Record<string, unknown>);
}

export function getOrderSummary() {
  return get<OrderSummary>("/orders/summary");
}

export function getOrderById(id: string) {
  return get<Order>(`/orders/${id}`);
}

export function submitOrder(params: SubmitOrderParams) {
  return post<Order>("/orders", params);
}

export function previewOrder(params: SubmitOrderParams) {
  return post<OrderPreviewResult>("/orders/preview", params);
}

export function recordCheckoutAbandonment(params: CheckoutAbandonmentPayload) {
  return post<{ id: string; status: string } | null>("/orders/checkout-abandonments", params);
}

export function cancelOrder(id: string) {
  return post<void>(`/orders/${id}/cancel`);
}

export function confirmReceive(id: string) {
  return post<void>(`/orders/${id}/confirm`);
}

/** Stripe Checkout锛氳繑鍥炶烦杞?URL */
export function createStripeCheckoutSession(id: string) {
  return post<{ url: string }>(`/orders/${id}/stripe-checkout`);
}

export function payOrder(id: string, channel: string) {
  return post<void>(`/orders/${id}/pay`, { channel });
}
