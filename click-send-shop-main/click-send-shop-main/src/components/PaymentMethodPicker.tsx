import { CreditCard, MessageSquare, Wallet } from "lucide-react";

export type PaymentMethod = "online" | "reward_wallet" | "whatsapp";

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  /** 是否禁用在线支付（例如后端未配置 Stripe） */
  onlineDisabled?: boolean;
  /** 在线支付不可用时的提示文案 */
  onlineDisabledHint?: string;
  rewardBalance?: number;
}

export default function PaymentMethodPicker({
  value,
  onChange,
  onlineDisabled = false,
  onlineDisabledHint = "在线支付暂不可用，请联系客服",
  rewardBalance = 0,
}: PaymentMethodPickerProps) {
  const options = [
    {
      id: "online" as const,
      icon: CreditCard,
      title: "在线支付",
      desc: "支持银行卡 / Visa / Mastercard，支付完成自动确认",
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
  ];

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isActive = value === opt.id;
        const isDisabled = opt.disabled;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => !isDisabled && onChange(opt.id)}
            disabled={isDisabled}
            className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
              isActive
                ? "border-gold bg-gold/5"
                : "border-border hover:border-gold/40"
            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <opt.icon
              size={22}
              className={`mt-0.5 flex-shrink-0 ${
                isActive ? "text-gold" : "text-muted-foreground"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {opt.title}
                </p>
                {opt.recommended && !isDisabled && (
                  <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
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
        );
      })}
    </div>
  );
}
