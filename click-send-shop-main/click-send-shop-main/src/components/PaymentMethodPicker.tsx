import { Building2, CreditCard, MessageSquare, Smartphone, Wallet } from "lucide-react";
import type { PublicPaymentChannel } from "@/services/paymentService";

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
  const options = [
    {
      id: "online" as const,
      icon: CreditCard,
      title: "在线支付",
      desc: onlineChannels.length > 0
        ? "支持 FPX 网上银行 / 电子钱包 / Stripe，支付完成自动确认"
        : "支持银行卡 / Visa / Mastercard，支付完成自动确认",
      recommended: true,
      disabled: onlineDisabled,
      disabledHint: onlineDisabledHint,
    },
    {
      id: "reward_wallet" as const,
      icon: Wallet,
      title: "返现钱包",
      desc: `使用返现余额直接支付（可用 RM ${rewardBalance.toFixed(2)}）`,
      recommended: false,
      disabled: false,
      disabledHint: "",
    },
    {
      id: "whatsapp" as const,
      icon: MessageSquare,
      title: "联系客服下单",
      desc: "通过 WhatsApp / 微信 与客服确认订单与付款",
      recommended: false,
      disabled: false,
      disabledHint: "",
    },
  ].filter((opt) => (opt.id === "online" ? showOnline : showCustomerService));

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isActive = value === opt.id;
        const isDisabled = opt.disabled;
        const showChannels = opt.id === "online" && isActive && onlineChannels.length > 0 && !isDisabled;
        return (
          <div
            key={opt.id}
            className={`rounded-xl border transition-colors ${
              isActive
                ? "border-gold bg-gold/5"
                : "border-border hover:border-gold/40"
            } ${isDisabled ? "opacity-50" : ""}`}
          >
            <button
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
                    <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-theme-price">
                      推荐
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {isDisabled ? opt.disabledHint : opt.desc}
                </p>
              </div>
              <div
                className={`mt-1 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                  isActive ? "border-gold bg-gold" : "border-muted-foreground"
                }`}
              />
            </button>
            {showChannels ? (
              <div className="border-t border-border/70 px-3.5 pb-3.5 pt-2">
                <p className="mb-2 text-[11px] font-semibold text-muted-foreground">选择支付渠道</p>
                <div className="grid grid-cols-2 gap-2">
                  {onlineChannels.map((channel) => {
                    const selected = selectedOnlineChannelCode === channel.code;
                    const Icon = channel.provider === "malaysia_local"
                      ? channel.code === "fpx" ? Building2 : Smartphone
                      : CreditCard;
                    return (
                      <button
                        key={channel.code}
                        type="button"
                        onClick={() => onOnlineChannelChange?.(channel.code)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          selected
                            ? "border-gold bg-gold/10 text-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        <Icon size={15} className={selected ? "text-theme-price" : "text-muted-foreground"} />
                        <span className="min-w-0 flex-1 truncate font-semibold">{channel.name}</span>
                      </button>
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
