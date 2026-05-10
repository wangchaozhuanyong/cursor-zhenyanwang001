import { get, post, put } from "../request";
import type { CheckoutAbandonment, CheckoutAbandonmentStatus, Order, OrderListParams } from "@/types/order";
import type { PaginatedData } from "@/types/common";

export function getOrders(params?: OrderListParams) {
  return get<PaginatedData<Order>>("/admin/orders", params as Record<string, string>);
}

export function getOrderById(id: string) {
  return get<Order>(`/admin/orders/${id}`);
}

export function updateOrderStatus(id: string, status: string, remark?: string) {
  return put<Order>(`/admin/orders/${id}/status`, { status, remark });
}

export function shipOrder(id: string, trackingNo: string, carrier: string) {
  return put<Order>(`/admin/orders/${id}/ship`, { trackingNo, carrier });
}

export function refreshOrderLogistics(id: string) {
  return post<Pick<Order, "logistics_provider" | "logistics_timeline">>(`/admin/orders/${id}/logistics/refresh`);
}

export function getCheckoutAbandonments(params?: {
  status?: CheckoutAbandonmentStatus | "";
  keyword?: string;
  page?: number;
  pageSize?: number;
}) {
  return get<PaginatedData<CheckoutAbandonment>>("/admin/checkout-abandonments", params as Record<string, string | number>);
}
