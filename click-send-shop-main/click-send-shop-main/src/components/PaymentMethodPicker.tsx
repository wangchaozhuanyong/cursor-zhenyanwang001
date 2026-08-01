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
    <div className="sf-next-payment-options">
      {options.map((opt) => {
        const isActive = value === opt.id;
        const isDisabled = opt.disabled;
        const showChannels = opt.id === "online" && isActive && onlineChannels.length > 0 && !isDisabled;
        return (
          <div
            key={opt.id}
            className={`sf-next-payment-option ${isActive ? "is-active" : ""} ${isDisabled ? "is-disabled" : ""}`}
          >
            <UnifiedButton
              type="button"
              onClick={() => !isDisabled && onChange(opt.id)}
              disabled={isDisabled}
              className="sf-next-payment-option__button"
            >
              <opt.icon
                size={22}
                className="sf-next-payment-option__icon"
              />
              <div className="sf-next-payment-option__copy">
                <div className="sf-next-payment-option__title-row">
                  <p>
                    {opt.title}
                  </p>
                  {opt.recommended && !isDisabled && (
                    <span className="sf-next-payment-option__recommended">
                      {copy.recommended}
                    </span>
                  )}
                </div>
                <p className="sf-next-payment-option__description">
                  {isDisabled ? opt.disabledHint : opt.desc}
                </p>
              </div>
              <div
                className="sf-next-payment-option__indicator"
              />
            </UnifiedButton>
            {showChannels ? (
              <div className="sf-next-payment-channels">
                <p>{copy.selectChannel}</p>
                <div className="sf-next-payment-channels__grid">
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
                        className={`sf-next-payment-channel ${selected ? "is-selected" : ""}`}
                      >
                        <Icon size={15} />
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
