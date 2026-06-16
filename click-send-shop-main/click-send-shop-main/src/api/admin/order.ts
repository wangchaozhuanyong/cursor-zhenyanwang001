import { get, post, put } from "@/api/request";
import type {
  AdminOrderSummary,
  CheckoutAbandonment,
  CheckoutAbandonmentStatus,
  Order,
  OrderListParams,
  ShortageAdjustmentPreview,
  ShortageAdjustmentRequest,
} from "@/types/order";
import type { PaginatedData } from "@/types/common";

export type AdminOrderVoiceEventType = "order_created" | "payment_success";

export interface AdminOrderVoiceEvent {
  id: string;
  type: AdminOrderVoiceEventType;
  orderId: string | number;
  orderNo: string;
  amount?: string;
  createdAt: string;
}

export interface AdminOrderVoiceEventsResponse {
  events: AdminOrderVoiceEvent[];
  checkedAt?: string;
}

export function getOrders(params?: OrderListParams) {
  return get<PaginatedData<Order>>("/admin/orders", params as unknown as Record<string, string>);
}

export function getOrderSummary(params?: OrderListParams) {
  return get<AdminOrderSummary>("/admin/orders/summary", params as unknown as Record<string, string>);
}

export function getOrderById(id: string) {
  return get<Order>(`/admin/orders/${id}`);
}

export function updateOrderStatus(id: string, status: string, remark?: string) {
  return put<Order>(`/admin/orders/${id}/status`, { status, remark });
}

export function shipOrder(
  id: string,
  trackingNo: string,
  carrier: string,
  shippingCostAmount?: number,
) {
  return put<Order>(`/admin/orders/${id}/ship`, {
    trackingNo,
    carrier,
    shipping_cost_amount: shippingCostAmount,
  });
}

export function refreshOrderLogistics(id: string) {
  return post<Pick<Order, "logistics_provider" | "logistics_timeline" | "logistics_snapshot"> & { tracking_notice?: string }>(`/admin/orders/${id}/logistics/refresh`);
}

export function previewShortageAdjustment(id: string, payload: ShortageAdjustmentRequest) {
  return post<ShortageAdjustmentPreview>(`/admin/orders/${id}/shortage-adjustment/preview`, payload);
}

export function applyShortageAdjustment(id: string, payload: ShortageAdjustmentRequest) {
  return post<{ adjustment_id: string; order_id: string; refund_amount: number }>(
    `/admin/orders/${id}/shortage-adjustment/apply`,
    payload,
  );
}

export function getRecentOrderEvents(since?: string) {
  return get<AdminOrderVoiceEventsResponse>(
    "/admin/order-events/recent",
    since ? { since } : undefined,
    { loadingMode: "silent" },
  );
}

export function getCheckoutAbandonments(params?: {
  status?: CheckoutAbandonmentStatus | "";
  keyword?: string;
  page?: number;
  pageSize?: number;
}) {
  return get<PaginatedData<CheckoutAbandonment>>("/admin/checkout-abandonments", params as Record<string, string | number>);
}
