import { get, post, put } from "@/api/request";
import type { PaginatedData } from "@/types/common";

export interface MyInvoisProfile {
  id?: string;
  enabled: boolean;
  environment: "sandbox" | "live";
  supplier_tin?: string;
  supplier_name?: string;
  supplier_id_type?: string;
  supplier_id_value?: string;
  supplier_sst?: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_address?: Record<string, unknown>;
  client_id?: string;
  client_secret_ref?: string;
  certificate_ref?: string;
  certificate_fingerprint?: string;
  certificate_expires_at?: string | null;
  signing_key_ref?: string;
  config_json?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface MyInvoisStatus {
  env_enabled: boolean;
  submit_enabled: boolean;
  configured: boolean;
  active: boolean;
  profile: MyInvoisProfile | null;
}

export interface MyInvoisDocument {
  id: string;
  document_type: "invoice" | "credit_note" | string;
  source_type: string;
  source_id: string;
  order_id: string;
  order_no: string;
  user_id: string | null;
  currency: string;
  amount: number | string;
  status: string;
  retry_count: number;
  next_attempt_at?: string | null;
  lhdn_submission_uid?: string | null;
  lhdn_uuid?: string | null;
  validation_link?: string | null;
  last_error?: string | null;
  submitted_at?: string | null;
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyInvoisDocumentListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  documentType?: string;
  orderId?: string;
}

export function getMyInvoisStatus() {
  return get<MyInvoisStatus>("/admin/myinvois/status");
}

export function updateMyInvoisConfig(payload: MyInvoisProfile) {
  return put<void>("/admin/myinvois/config", payload);
}

export function getMyInvoisDocuments(params?: MyInvoisDocumentListParams) {
  return get<PaginatedData<MyInvoisDocument>>("/admin/myinvois/documents", params as unknown as Record<string, string>);
}

export function retryMyInvoisDocument(id: string) {
  return post<void>(`/admin/myinvois/documents/${id}/retry`);
}

export function submitMyInvoisDocument(id: string) {
  return post<void>(`/admin/myinvois/documents/${id}/submit`);
}

export function processPendingMyInvois(limit = 20) {
  return post<{ processed: number; skipped?: boolean }>("/admin/myinvois/process-pending", { limit });
}

export function createMyInvoisReconciliation(payload: { reconcile_date: string; document_type?: string; notes?: string }) {
  return post<{ id: string }>("/admin/myinvois/reconciliations", payload);
}
