import { get, post } from "../request";

export interface PaymentConfig {
  mockPayment: boolean;
  stripeReady: boolean;
  stripeCheckoutReady: boolean;
  publicAppUrlConfigured: boolean;
  stripeWebhookUrl: string;
  docs: string;
}

export function getPaymentConfig() {
  return get<PaymentConfig>("/payment/config");
}

export interface PublicPaymentChannel {
  id: string;
  code: string;
  name: string;
  provider: string;
  country_code: string;
  currency: string;
  sort_order: number;
  environment: string;
}

export interface PaymentIntent {
  payment_order_id: string;
  status: string;
  channel_code?: string;
  redirect_url?: string | null;
  client_instructions?: string;
  reused?: boolean;
}

export function getPaymentChannels(params?: { country?: string; currency?: string }) {
  return get<PublicPaymentChannel[]>("/payments/channels", params);
}

export function createPaymentIntent(body: {
  order_id: string;
  channel_code: string;
  idempotency_key?: string;
  return_url?: string;
}) {
  return post<PaymentIntent>("/payments/intents", body);
}
