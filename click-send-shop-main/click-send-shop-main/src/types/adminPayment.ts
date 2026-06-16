export interface PaymentChannelRow {
  id: string;
  code: string;
  name: string;
  provider: string;
  country_code: string;
  currency: string;
  sort_order: number;
  enabled: number | boolean;
  environment: string;
  config_json: Record<string, unknown> | null;
}

export interface PaymentOrderAdminRow {
  id: string;
  user_id: string;
  order_id: string;
  order_no: string;
  channel_code: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  payment_transaction_no: string;
  payment_time: string | null;
  metadata: Record<string, unknown> | null;
  buyer_phone?: string;
  latest_error_message?: string;
  latest_failure_reason_code?: string;
  latest_processing_result?: string;
  latest_review_status?: string;
  latest_event_at?: string | null;
  created_at: string;
}

export interface PaymentEventAdminRow {
  id: string;
  payment_order_id: string | null;
  order_id: string | null;
  provider: string;
  provider_event_id: string | null;
  event_type: string;
  verify_status: string;
  processing_result: string;
  payload_json: unknown;
  error_message: string;
  failure_reason_code?: string;
  expected_amount?: number | null;
  actual_amount?: number | null;
  expected_currency?: string;
  actual_currency?: string;
  risk_level?: string;
  review_status?: string;
  review_note?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface PaymentReconciliationRow {
  id: string;
  reconcile_date: string;
  provider: string;
  channel_code: string;
  order_count: number;
  success_amount: number;
  provider_report_amount?: number | null;
  provider_fee_amount?: number;
  expected_settlement_amount?: number;
  diff_amount: number;
  provider_reference?: string;
  difference_reason?: string;
  review_status?: string;
  review_notes?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  status: string;
  notes: string;
  created_at: string;
}

export type PaymentReviewStatus =
  | "pending"
  | "needs_review"
  | "confirmed"
  | "needs_followup"
  | "rejected"
  | "ignored";
