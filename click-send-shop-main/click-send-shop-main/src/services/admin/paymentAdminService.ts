import * as api from "@/api/admin/payments";
import type { PaginatedData } from "@/types/common";
import { unwrapList, unwrapPaginated } from "@/services/responseNormalize";
import type {
  PaymentChannelRow,
  PaymentOrderAdminRow,
  PaymentEventAdminRow,
  PaymentReconciliationRow,
} from "@/types/adminPayment";

export async function fetchAdminPaymentChannels(): Promise<PaymentChannelRow[]> {
  const res = await api.getAdminPaymentChannels();
  return unwrapList<PaymentChannelRow>(res.data);
}

export async function updateAdminPaymentChannel(
  id: string,
  body: Parameters<typeof api.putAdminPaymentChannel>[1],
): Promise<void> {
  await api.putAdminPaymentChannel(id, body);
}

export async function fetchAdminPaymentOrders(
  params?: Record<string, string>,
): Promise<PaginatedData<PaymentOrderAdminRow>> {
  const res = await api.getAdminPaymentOrders(params);
  return unwrapPaginated<PaymentOrderAdminRow>(res.data);
}

export async function fetchAdminPaymentEvents(
  params?: Record<string, string>,
): Promise<PaginatedData<PaymentEventAdminRow>> {
  const res = await api.getAdminPaymentEvents(params);
  return unwrapPaginated<PaymentEventAdminRow>(res.data);
}

export async function markAdminOrderPaid(orderId: string, body: { reason?: string; channel_code?: string }) {
  await api.postAdminMarkOrderPaid(orderId, body);
}

export async function replayAdminPaymentEvent(eventId: string) {
  const res = await api.postAdminReplayPaymentEvent(eventId);
  return res.data;
}

export async function fetchAdminPaymentReconciliations(
  params?: Record<string, string>,
): Promise<PaginatedData<PaymentReconciliationRow>> {
  const res = await api.getAdminPaymentReconciliations(params);
  return unwrapPaginated<PaymentReconciliationRow>(res.data);
}

export async function createAdminPaymentReconciliation(body: Parameters<typeof api.postAdminPaymentReconciliation>[0]) {
  const res = await api.postAdminPaymentReconciliation(body);
  return res.data;
}
