import { get } from "../request";

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
