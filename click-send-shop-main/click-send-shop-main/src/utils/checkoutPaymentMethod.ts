import type { PaymentMethod } from "@/components/PaymentMethodPicker";

type OnlinePaymentChannelLike = {
  code?: string | null;
  provider?: string | null;
  sort_order?: number | null;
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

function onlinePaymentChannelPriority(channel: OnlinePaymentChannelLike): number {
  const provider = String(channel.provider || "").toLowerCase();
  const code = String(channel.code || "").toLowerCase();
  if (provider === "billplz" || provider === "fpx" || code.includes("billplz") || code.includes("fpx")) return 0;
  if (provider === "malaysia_local" || provider === "malaysia-local") return 1;
  if (provider === "stripe") return 5;
  return 3;
}

export function sortPreferredOnlinePaymentChannels<T extends OnlinePaymentChannelLike>(channels: T[]): T[] {
  return channels
    .map((channel, index) => ({ channel, index }))
    .sort((a, b) => {
      const priorityDiff = onlinePaymentChannelPriority(a.channel) - onlinePaymentChannelPriority(b.channel);
      if (priorityDiff !== 0) return priorityDiff;
      const sortA = Number(a.channel.sort_order ?? 0);
      const sortB = Number(b.channel.sort_order ?? 0);
      if (sortA !== sortB) return sortA - sortB;
      return a.index - b.index;
    })
    .map((item) => item.channel);
}

export function filterUsableOnlinePaymentChannels<T extends OnlinePaymentChannelLike>(
  channels: T[],
  stripeCheckoutReady: boolean,
): T[] {
  return sortPreferredOnlinePaymentChannels(
    channels.filter((channel) => isUsableOnlinePaymentChannel(channel, stripeCheckoutReady)),
  );
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
