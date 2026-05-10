import * as paymentApi from "@/api/modules/payment";
import type { PaymentConfig, PaymentIntent, PublicPaymentChannel } from "@/api/modules/payment";

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const res = await paymentApi.getPaymentConfig();
  return res.data;
}

export async function getPaymentChannels(): Promise<PublicPaymentChannel[]> {
  const res = await paymentApi.getPaymentChannels({ country: "MY", currency: "MYR" });
  return res.data;
}

export async function createPaymentIntent(params: {
  orderId: string;
  channelCode: string;
  returnUrl?: string;
}): Promise<PaymentIntent> {
  const res = await paymentApi.createPaymentIntent({
    order_id: params.orderId,
    channel_code: params.channelCode,
    idempotency_key: `checkout:${params.channelCode}:${params.orderId}`,
    return_url: params.returnUrl,
  });
  return res.data;
}

export type { PublicPaymentChannel, PaymentIntent };
