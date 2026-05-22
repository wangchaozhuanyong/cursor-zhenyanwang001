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

export async function shipOrder(
  id: string,
  trackingNo: string,
  carrier: string,
  shippingCostAmount?: number,
) {
  const res = await orderApi.shipOrder(id, trackingNo, carrier, shippingCostAmount);
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

export async function exportOrdersCsv(params?: OrderListParams) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.paymentStatus) qs.set("paymentStatus", params.paymentStatus);
  if (params?.keyword) qs.set("keyword", params.keyword);
  if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo) qs.set("dateTo", params.dateTo);
  if (params?.payment_method) qs.set("payment_method", params.payment_method);
  if (params?.payment_channel) qs.set("payment_channel", params.payment_channel);
  if (params?.shipping_name) qs.set("shipping_name", params.shipping_name);
  if (params?.returnStatus) qs.set("returnStatus", params.returnStatus);
  if (params?.refundStatus) qs.set("refundStatus", params.refundStatus);
  if (params?.hasNote) qs.set("hasNote", params.hasNote);
  if (params?.costStatus) qs.set("costStatus", params.costStatus);
  if (params?.overduePayment) qs.set("overduePayment", params.overduePayment);
  if (params?.overdueShipment) qs.set("overdueShipment", params.overdueShipment);
  if (params?.buyerType) qs.set("buyerType", params.buyerType);
  if (params?.amountMin !== undefined) qs.set("amountMin", String(params.amountMin));
  if (params?.amountMax !== undefined) qs.set("amountMax", String(params.amountMax));
  if (params?.ids?.length) qs.set("ids", params.ids.join(","));
  const q = qs.toString();
  await downloadAdminCsv(`/admin/orders/export${q ? `?${q}` : ""}`, "orders.csv");
}
