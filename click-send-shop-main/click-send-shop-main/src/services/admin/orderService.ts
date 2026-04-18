import * as orderApi from "@/api/admin/order";
import type { Order, OrderListParams } from "@/types/order";
import type { PaginatedData } from "@/types/common";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchOrders(params?: OrderListParams): Promise<PaginatedData<Order>> {
  const res = await orderApi.getOrders(params);
  return unwrapPaginated<Order>(res.data);
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

export async function exportOrdersCsv(params?: { status?: string; paymentStatus?: string; keyword?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.paymentStatus) qs.set("paymentStatus", params.paymentStatus);
  if (params?.keyword) qs.set("keyword", params.keyword);
  const q = qs.toString();
  await downloadAdminCsv(`/admin/orders/export${q ? `?${q}` : ""}`, "orders.csv");
}
