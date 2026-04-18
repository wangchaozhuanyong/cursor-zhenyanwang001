import { get, put } from "../request";
import type { Order, OrderListParams } from "@/types/order";
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
