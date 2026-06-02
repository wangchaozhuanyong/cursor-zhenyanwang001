import type { PaymentMethod } from "@/components/PaymentMethodPicker";

type OnlinePaymentChannelLike = {
  provider?: string | null;
};

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

export function isUsableOnlinePaymentChannel(
  channel: OnlinePaymentChannelLike,
  stripeCheckoutReady: boolean,
): boolean {
  const provider = String(channel.provider || "").toLowerCase();
  if (!provider || provider === "internal") return false;
  if (provider === "stripe") return stripeCheckoutReady;
  return true;
}

export function filterUsableOnlinePaymentChannels<T extends OnlinePaymentChannelLike>(
  channels: T[],
  stripeCheckoutReady: boolean,
): T[] {
  return channels.filter((channel) => isUsableOnlinePaymentChannel(channel, stripeCheckoutReady));
}

export function hasUsableOnlinePaymentChannel(
  channels: OnlinePaymentChannelLike[],
  stripeCheckoutReady: boolean,
): boolean {
  return filterUsableOnlinePaymentChannels(channels, stripeCheckoutReady).length > 0;
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
