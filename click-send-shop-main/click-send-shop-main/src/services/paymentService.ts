import * as paymentApi from "@/api/modules/payment";
import type { PaymentConfig } from "@/api/modules/payment";

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const res = await paymentApi.getPaymentConfig();
  return res.data;
}
