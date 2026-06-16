import { get, patch, post, put } from "@/api/request";
import type { PaginatedData } from "@/types/common";
import type {
  PaymentChannelRow,
  PaymentOrderAdminRow,
  PaymentEventAdminRow,
  PaymentReconciliationRow,
  PaymentReviewStatus,
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
  return get<PaginatedData<PaymentOrderAdminRow>>("/admin/payments/orders", params as unknown as Record<string, unknown>);
}

export function getAdminPaymentEvents(params?: Record<string, string>) {
  return get<PaginatedData<PaymentEventAdminRow>>("/admin/payments/events", params as unknown as Record<string, unknown>);
}

export function patchAdminPaymentEventReview(eventId: string, body: {
  review_status: PaymentReviewStatus;
  review_note?: string;
}) {
  return patch<{ id: string; review_status: PaymentReviewStatus }>(`/admin/payments/events/${eventId}/review`, body);
}

export function postAdminMarkOrderPaid(orderId: string, body: {
  reason?: string;
  channel_code?: string;
  payment_channel?: string;
  payment_reference?: string;
  admin_remark?: string;
}) {
  return post<null>(`/admin/payments/orders/${orderId}/mark-paid`, body);
}

export function postAdminReplayPaymentEvent(eventId: string) {
  return post<{ event: PaymentEventAdminRow }>(`/admin/payments/events/${eventId}/replay`);
}

export function getAdminPaymentReconciliations(params?: Record<string, string>) {
  return get<PaginatedData<PaymentReconciliationRow>>(
    "/admin/payments/reconciliations",
    params as unknown as Record<string, unknown>,
  );
}

export function postAdminPaymentReconciliation(body: {
  reconcile_date: string;
  provider: string;
  channel_code?: string;
  diff_amount?: number;
  provider_report_amount?: number;
  provider_fee_amount?: number;
  provider_reference?: string;
  difference_reason?: string;
  notes?: string;
}) {
  return post<{ id: string }>("/admin/payments/reconciliations", body);
}

export function patchAdminPaymentReconciliationReview(id: string, body: {
  review_status: Extract<PaymentReviewStatus, "confirmed" | "needs_followup" | "rejected" | "ignored">;
  review_notes?: string;
  difference_reason?: string;
}) {
  return patch<{ id: string; status: string; review_status: PaymentReviewStatus }>(
    `/admin/payments/reconciliations/${id}/review`,
    body,
  );
}
