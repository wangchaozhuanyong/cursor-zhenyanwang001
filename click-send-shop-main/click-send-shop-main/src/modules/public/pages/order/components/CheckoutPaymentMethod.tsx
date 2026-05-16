import { ShieldCheck } from "lucide-react";
import PaymentMethodPicker, { type PaymentMethod } from "@/components/PaymentMethodPicker";
import type { PublicPaymentChannel } from "@/services/paymentService";

interface CheckoutPaymentMethodProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  paymentConfigLoaded: boolean;
  paymentChannels: PublicPaymentChannel[];
  stripeReady: boolean;
  rewardBalance: number;
  selectedPaymentChannelCode: string;
  onPaymentChannelChange: (value: string) => void;
}

export function CheckoutPaymentMethod({
  paymentMethod,
  onPaymentMethodChange,
  paymentConfigLoaded,
  paymentChannels,
  stripeReady,
  rewardBalance,
  selectedPaymentChannelCode,
  onPaymentChannelChange,
}: CheckoutPaymentMethodProps) {
  return (
    <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">2. 支付方式</h3>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck size={12} className="text-emerald-600" /> 安全支付
        </span>
      </div>
      <PaymentMethodPicker
        value={paymentMethod}
        onChange={onPaymentMethodChange}
        onlineDisabled={paymentConfigLoaded && paymentChannels.length === 0 && !stripeReady}
        onlineDisabledHint="商户暂未开通在线支付，请选择联系客服下单"
        rewardBalance={rewardBalance}
        onlineChannels={paymentChannels}
        selectedOnlineChannelCode={selectedPaymentChannelCode}
        onOnlineChannelChange={onPaymentChannelChange}
      />
    </div>
  );
}
