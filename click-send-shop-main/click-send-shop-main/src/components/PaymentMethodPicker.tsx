import { CreditCard, MessageSquare } from "lucide-react";

export type PaymentMethod = "whatsapp" | "online";

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export default function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  const options = [
    {
      id: "whatsapp" as const,
      icon: MessageSquare,
      title: "聊天下单",
      desc: "通过 WhatsApp / 微信发送订单给客服",
    },
    {
      id: "online" as const,
      icon: CreditCard,
      title: "在线支付",
      desc: "模拟支付通道（可替换为真实网关）",
    },
  ];

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
            value === opt.id ? "border-gold bg-gold/5" : "border-border"
          }`}
        >
          <opt.icon size={20} className={value === opt.id ? "text-gold" : "text-muted-foreground"} />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{opt.title}</p>
            <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
          </div>
          <div className={`h-4 w-4 rounded-full border-2 ${value === opt.id ? "border-gold bg-gold" : "border-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}
