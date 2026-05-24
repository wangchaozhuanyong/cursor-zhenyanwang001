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

export function shouldShowPaymentOption(
  id: PaymentMethod,
  showOnline: boolean,
  showCustomerService: boolean,
): boolean {
  if (id === "online") return showOnline;
  if (id === "whatsapp") return showCustomerService;
  return true;
}
