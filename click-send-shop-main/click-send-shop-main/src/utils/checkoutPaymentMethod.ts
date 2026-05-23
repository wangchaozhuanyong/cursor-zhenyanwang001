import type { PaymentMethod } from "@/components/PaymentMethodPicker";

/** Resolve persisted payment_method: only downgrade online when online gateway is disabled. */
export function resolveEffectivePaymentMethod(
  selected: PaymentMethod,
  onlinePaymentEnabled: boolean,
): PaymentMethod {
  if (selected === "online" && !onlinePaymentEnabled) return "whatsapp";
  return selected;
}

export function canStartOnlinePayment(
  method: string | undefined,
  onlinePaymentEnabled: boolean,
): boolean {
  const m = method || "";
  const onlineLike = m === "online" || m === "points_plus_cash";
  return onlineLike && onlinePaymentEnabled;
}
