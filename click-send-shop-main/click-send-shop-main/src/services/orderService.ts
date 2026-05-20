import * as orderApi from "@/api/modules/order";
import type { Order, SubmitOrderParams, OrderListParams, CheckoutAbandonmentPayload, OrderSummary } from "@/types/order";
import type { OrderPreviewResult } from "@/types/orderPreview";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchOrders(params?: OrderListParams): Promise<PaginatedData<Order>> {
  const res = await orderApi.getOrders(params);
  return unwrapPaginated<Order>(res.data);
}

function buildOrderSummaryFromOrders(orders: Order[]): OrderSummary {
  const pending_payment = orders.filter((o) =>
    o.status === "pending" && o.payment_status !== "paid"
  ).length;
  const pending_ship = orders.filter((o) =>
    o.status === "paid"
      || (o.payment_status === "paid"
        && o.status !== "shipped"
        && o.status !== "completed"
        && o.status !== "cancelled"
        && o.status !== "refunding"
        && o.status !== "refunded")
  ).length;
  const pending_receive = orders.filter((o) => o.status === "shipped").length;
  const pending_review = orders.reduce((acc, o) => (
    acc + (o.status === "completed" ? o.items.filter((it) => it.can_review).length : 0)
  ), 0);
  const after_sale = orders.filter((o) =>
    o.status === "refunding"
    || o.status === "refunded"
    || Number(o.return_request_count || 0) > 0,
  ).length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  return { pending_payment, pending_ship, pending_receive, pending_review, after_sale, completed, cancelled };
}

export async function fetchOrderSummary(): Promise<OrderSummary> {
  try {
    const res = await orderApi.getOrderSummary();
    return res.data as OrderSummary;
  } catch {
    const data = await fetchOrders({ page: 1, pageSize: 200 });
    return buildOrderSummaryFromOrders(data.list);
  }
}

export async function fetchOrderById(id: string) {
  const res = await orderApi.getOrderById(id);
  return res.data;
}

export async function submitOrder(params: SubmitOrderParams) {
  const res = await orderApi.submitOrder(params);
  return res.data;
}

export async function previewOrder(params: SubmitOrderParams): Promise<OrderPreviewResult> {
  const res = await orderApi.previewOrder(params);
  return res.data;
}

export async function recordCheckoutAbandonment(params: CheckoutAbandonmentPayload) {
  const res = await orderApi.recordCheckoutAbandonment(params);
  return res.data;
}

export async function cancelOrder(id: string) {
  await orderApi.cancelOrder(id);
}

export async function confirmReceive(id: string) {
  await orderApi.confirmReceive(id);
}

export async function createStripeCheckoutSession(id: string) {
  const res = await orderApi.createStripeCheckoutSession(id);
  return res.data;
}

export async function payOrder(id: string, channel: "reward_wallet" | "online" | "whatsapp") {
  await orderApi.payOrder(id, channel);
}
