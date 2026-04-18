import * as orderApi from "@/api/modules/order";
import type { Order, SubmitOrderParams, OrderListParams } from "@/types/order";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchOrders(params?: OrderListParams): Promise<PaginatedData<Order>> {
  const res = await orderApi.getOrders(params);
  return unwrapPaginated<Order>(res.data);
}

export async function fetchOrderById(id: string) {
  const res = await orderApi.getOrderById(id);
  return res.data;
}

export async function submitOrder(params: SubmitOrderParams) {
  const res = await orderApi.submitOrder(params);
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
