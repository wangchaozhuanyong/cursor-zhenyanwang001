import { del, get, post, type RequestOptions } from "@/api/request";
import type { Order, SubmitOrderParams, OrderListParams, CheckoutAbandonmentPayload } from "@/types/order";
import type { OrderPreviewResult } from "@/types/orderPreview";
import type { CheckoutCouponsResult } from "@/types/coupon";
import type { PaginatedData } from "@/types/common";
import type { OrderSummary } from "@/types/order";

type OrderReadOptions = Pick<RequestOptions, "skipGlobalLoading" | "loadingMode" | "signal" | "timeoutMs" | "skipAuthRetry" | "suppressAuthExpired">;

export function getOrders(params?: OrderListParams) {
  return get<PaginatedData<Order>>("/orders", params as unknown as Record<string, unknown>);
}

export function getOrderSummary() {
  return get<OrderSummary>("/orders/summary");
}

export function getOrderById(id: string, options?: OrderReadOptions) {
  return get<Order>(`/orders/${id}`, undefined, options);
}

export function submitOrder(params: SubmitOrderParams) {
  return post<Order>("/orders", params);
}

export function previewOrder(params: SubmitOrderParams) {
  return post<OrderPreviewResult>("/orders/preview", params);
}

export function checkoutCoupons(params: SubmitOrderParams) {
  return post<CheckoutCouponsResult>("/orders/checkout/coupons", params, { loadingMode: "silent" });
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

export function deleteOrder(id: string) {
  return del<void>(`/orders/${id}`);
}

/** Stripe Checkout：返回跳转 URL。 */
export function createStripeCheckoutSession(id: string) {
  return post<{ url: string }>(`/orders/${id}/stripe-checkout`);
}

export function payOrder(id: string, channel: string) {
  return post<void>(`/orders/${id}/pay`, { channel });
}
