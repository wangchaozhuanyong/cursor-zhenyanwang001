import * as orderApi from "@/api/admin/order";
import type { AdminOrderVoiceEvent } from "@/api/admin/order";

export type { AdminOrderVoiceEvent };
import type { AdminOrderSummary, CheckoutAbandonment, CheckoutAbandonmentStatus, Order, OrderListParams } from "@/types/order";
import type { PaginatedData } from "@/types/common";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchOrders(params?: OrderListParams): Promise<PaginatedData<Order> & { summary?: AdminOrderSummary }> {
  const res = await orderApi.getOrders(params);
  const page = unwrapPaginated<Order>(res.data);
  const summary = (
    res.data &&
    typeof res.data === "object" &&
    "summary" in (res.data as unknown as Record<string, unknown>)
  )
    ? ((res.data as unknown as Record<string, unknown>).summary as AdminOrderSummary)
    : undefined;
  return { ...page, summary };
}

export async function fetchOrderById(id: string) {
  const res = await orderApi.getOrderById(id);
  return res.data;
}

export async function updateOrderStatus(id: string, status: string, remark?: string) {
  const res = await orderApi.updateOrderStatus(id, status, remark);
  return res.data;
}

export async function shipOrder(id: string, trackingNo: string, carrier: string) {
  const res = await orderApi.shipOrder(id, trackingNo, carrier);
  return res.data;
}

export async function refreshOrderLogistics(id: string) {
  const res = await orderApi.refreshOrderLogistics(id);
  return res.data;
}

export async function fetchRecentOrderEvents(since?: string): Promise<AdminOrderVoiceEvent[]> {
  const res = await orderApi.getRecentOrderEvents(since);
  return res.data.events;
}

export async function fetchCheckoutAbandonments(params?: {
  status?: CheckoutAbandonmentStatus | "";
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedData<CheckoutAbandonment>> {
  const res = await orderApi.getCheckoutAbandonments(params);
  return unwrapPaginated<CheckoutAbandonment>(res.data);
}

export async function exportOrdersCsv(params?: { status?: string; paymentStatus?: string; keyword?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.paymentStatus) qs.set("paymentStatus", params.paymentStatus);
  if (params?.keyword) qs.set("keyword", params.keyword);
  const q = qs.toString();
  await downloadAdminCsv(`/admin/orders/export${q ? `?${q}` : ""}`, "orders.csv");
}
