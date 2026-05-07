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
  created_at: string;
}

export interface PaymentReconciliationRow {
  id: string;
  reconcile_date: string;
  provider: string;
  channel_code: string;
  order_count: number;
  success_amount: number;
  diff_amount: number;
  status: string;
  notes: string;
  created_at: string;
}
