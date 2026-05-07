import { get, post, put } from "../request";
import type { PaginatedData } from "@/types/common";
import type {
  PaymentChannelRow,
  PaymentOrderAdminRow,
  PaymentEventAdminRow,
  PaymentReconciliationRow,
} from "@/types/adminPayment";

export function getAdminPaymentChannels() {
  return get<PaymentChannelRow[]>("/admin/payments/channels");
}

export function putAdminPaymentChannel(
  id: string,
  body: Partial<{ name: string; enabled: boolean; sort_order: number; environment: "live" | "sandbox"; config_json: Record<string, unknown> }>,
) {
  return put<null>(`/admin/payments/channels/${id}`, body);
}

export function getAdminPaymentOrders(params?: Record<string, string>) {
  return get<PaginatedData<PaymentOrderAdminRow>>("/admin/payments/orders", params as Record<string, unknown>);
}

export function getAdminPaymentEvents(params?: Record<string, string>) {
  return get<PaginatedData<PaymentEventAdminRow>>("/admin/payments/events", params as Record<string, unknown>);
}

export function postAdminMarkOrderPaid(orderId: string, body: { reason?: string; channel_code?: string }) {
  return post<null>(`/admin/payments/orders/${orderId}/mark-paid`, body);
}

export function postAdminReplayPaymentEvent(eventId: string) {
  return post<{ event: PaymentEventAdminRow }>(`/admin/payments/events/${eventId}/replay`);
}

export function getAdminPaymentReconciliations(params?: Record<string, string>) {
  return get<PaginatedData<PaymentReconciliationRow>>(
    "/admin/payments/reconciliations",
    params as Record<string, unknown>,
  );
}

export function postAdminPaymentReconciliation(body: {
  reconcile_date: string;
  provider: string;
  channel_code?: string;
  diff_amount?: number;
  notes?: string;
}) {
  return post<{ id: string }>("/admin/payments/reconciliations", body);
}
