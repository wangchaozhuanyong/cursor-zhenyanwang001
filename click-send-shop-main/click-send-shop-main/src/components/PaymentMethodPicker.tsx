import { Building2, CreditCard, MessageSquare, Smartphone, Wallet } from "lucide-react";
import type { PublicPaymentChannel } from "@/services/paymentService";
import { shouldShowPaymentOption } from "@/utils/checkoutPaymentMethod";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

export type PaymentMethod = "online" | "reward_wallet" | "whatsapp";

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  /** 是否禁用在线支付（例如后端未配置 Stripe） */
  onlineDisabled?: boolean;
  /** 在线支付不可用时的提示文案 */
  onlineDisabledHint?: string;
  rewardBalance?: number;
  onlineChannels?: PublicPaymentChannel[];
  selectedOnlineChannelCode?: string;
  onOnlineChannelChange?: (code: string) => void;
  showOnline?: boolean;
  showCustomerService?: boolean;
}

const PAYMENT_PICKER_COPY: Record<PublicLocale, {
  online: string;
  onlineDescLocal: string;
  onlineDescCard: string;
  onlineDisabled: string;
  rewardWallet: string;
  rewardDesc: (balance: number) => string;
  support: string;
  supportDesc: string;
  recommended: string;
  selectChannel: string;
}> = {
  zh: {
    online: "在线支付",
    onlineDescLocal: "支持 FPX 网上银行 / 电子钱包 / Stripe，支付完成自动确认",
    onlineDescCard: "支持银行卡 / Visa / Mastercard，支付完成自动确认",
    onlineDisabled: "在线支付暂不可用，请联系客服",
    rewardWallet: "返现钱包",
    rewardDesc: (balance) => `使用返现余额直接支付（可用 RM ${balance.toFixed(2)}）`,
    support: "联系客服",
    supportDesc: "通过 WhatsApp / 微信 与客服确认订单与付款",
    recommended: "推荐",
    selectChannel: "选择支付渠道",
  },
  en: {
    online: "Online payment",
    onlineDescLocal: "Supports FPX online banking / e-wallet / Stripe, and confirms automatically after payment",
    onlineDescCard: "Supports bank card / Visa / Mastercard, and confirms automatically after payment",
    onlineDisabled: "Online payment is unavailable. Please contact support.",
    rewardWallet: "Reward wallet",
    rewardDesc: (balance) => `Pay with reward balance (available RM ${balance.toFixed(2)})`,
    support: "Contact support",
    supportDesc: "Confirm the order and payment with support via WhatsApp / WeChat",
    recommended: "Recommended",
    selectChannel: "Select payment channel",
  },
};

export default function PaymentMethodPicker({
  value,
  onChange,
  onlineDisabled = false,
  onlineDisabledHint = "在线支付暂不可用，请联系客服",
  rewardBalance = 0,
  onlineChannels = [],
  selectedOnlineChannelCode,
  onOnlineChannelChange,
  showOnline = true,
  showCustomerService = true,
}: PaymentMethodPickerProps) {
  const { locale } = usePublicLocale();
  const copy = PAYMENT_PICKER_COPY[locale];
  const disabledHint = onlineDisabledHint === undefined || onlineDisabledHint === "在线支付暂不可用，请联系客服"
    ? copy.onlineDisabled
    : onlineDisabledHint;
  const options = [
    {
      id: "online" as const,
      icon: CreditCard,
      title: copy.online,
      desc: onlineChannels.length > 0
        ? copy.onlineDescLocal
        : copy.onlineDescCard,
      recommended: true,
      disabled: onlineDisabled,
      disabledHint,
    },
    {
      id: "reward_wallet" as const,
      icon: Wallet,
      title: copy.rewardWallet,
      desc: copy.rewardDesc(rewardBalance),
      recommended: false,
      disabled: false,
      disabledHint: "",
    },
    {
      id: "whatsapp" as const,
      icon: MessageSquare,
      title: copy.support,
      desc: copy.supportDesc,
      recommended: false,
      disabled: false,
      disabledHint: "",
    },
  ].filter((opt) => shouldShowPaymentOption(opt.id, showOnline, showCustomerService));

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isActive = value === opt.id;
        const isDisabled = opt.disabled;
        const showChannels = opt.id === "online" && isActive && onlineChannels.length > 0 && !isDisabled;
        return (
          <div
            key={opt.id}
            className={`sf-next-payment-option rounded-xl border transition-colors ${
              isActive
                ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_7%,var(--theme-surface))]"
                : "border-border hover:border-[color-mix(in_srgb,var(--theme-price)_40%,var(--theme-border))]"
            } ${isDisabled ? "opacity-50" : ""}`}
          >
            <UnifiedButton
              type="button"
              onClick={() => !isDisabled && onChange(opt.id)}
              disabled={isDisabled}
              className={`flex w-full items-start gap-3 p-3.5 text-left ${isDisabled ? "cursor-not-allowed" : ""}`}
            >
              <opt.icon
                size={22}
                className={`mt-0.5 flex-shrink-0 ${
                  isActive ? "text-theme-price" : "text-muted-foreground"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {opt.title}
                  </p>
                  {opt.recommended && !isDisabled && (
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] px-2 py-0.5 text-[10px] font-bold text-theme-price">
                      {copy.recommended}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {isDisabled ? opt.disabledHint : opt.desc}
                </p>
              </div>
              <div
                className={`mt-1 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                  isActive ? "border-[var(--theme-price)] bg-[var(--theme-price)]" : "border-muted-foreground"
                }`}
              />
            </UnifiedButton>
            {showChannels ? (
              <div className="border-t border-border/70 px-3.5 pb-3.5 pt-2">
                <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{copy.selectChannel}</p>
                <div className="grid grid-cols-2 gap-2">
                  {onlineChannels.map((channel) => {
                    const selected = selectedOnlineChannelCode === channel.code;
                    const provider = String(channel.provider || "").toLowerCase();
                    const code = String(channel.code || "").toLowerCase();
                    const isLocalBankChannel = provider === "malaysia_local" || provider === "malaysia-local" || provider === "billplz" || provider === "fpx" || code.includes("fpx");
                    const Icon = isLocalBankChannel
                      ? code.includes("fpx") || provider === "billplz" || provider === "fpx" ? Building2 : Smartphone
                      : CreditCard;
                    return (
                      <UnifiedButton
                        key={channel.code}
                        type="button"
                        onClick={() => onOnlineChannelChange?.(channel.code)}
                        className={`sf-next-payment-channel flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          selected
                            ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] text-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        <Icon size={15} className={selected ? "text-theme-price" : "text-muted-foreground"} />
                        <span className="min-w-0 flex-1 truncate font-semibold">{channel.name}</span>
                      </UnifiedButton>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
