import { useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import PaymentMethodPicker, { type PaymentMethod } from "@/components/PaymentMethodPicker";
import type { PublicPaymentChannel } from "@/services/paymentService";
import { ResponsiveSheet, useMediaSheetMode } from "@/modules/micro-interactions";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  online: "在线支付",
  reward_wallet: "返现钱包",
  whatsapp: "联系客服下单",
};

interface CheckoutPaymentMethodProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  paymentTimeoutHint?: string | null;
  paymentConfigLoaded: boolean;
  paymentChannels: PublicPaymentChannel[];
  stripeReady: boolean;
  rewardBalance: number;
  selectedPaymentChannelCode: string;
  onPaymentChannelChange: (value: string) => void;
  showOnline: boolean;
  showCustomerService: boolean;
}

export function CheckoutPaymentMethod({
  paymentMethod,
  onPaymentMethodChange,
  paymentTimeoutHint,
  paymentConfigLoaded,
  paymentChannels,
  stripeReady,
  rewardBalance,
  selectedPaymentChannelCode,
  onPaymentChannelChange,
  showOnline,
  showCustomerService,
}: CheckoutPaymentMethodProps) {
  const isMobileSheet = useMediaSheetMode();
  const [sheetOpen, setSheetOpen] = useState(false);

  const picker = (
    <PaymentMethodPicker
      value={paymentMethod}
      onChange={onPaymentMethodChange}
      onlineDisabled={paymentConfigLoaded && paymentChannels.length === 0 && !stripeReady}
      onlineDisabledHint="商户暂未开通在线支付，请选择联系客服下单"
      rewardBalance={rewardBalance}
      onlineChannels={paymentChannels}
      selectedOnlineChannelCode={selectedPaymentChannelCode}
      onOnlineChannelChange={onPaymentChannelChange}
      showOnline={showOnline}
      showCustomerService={showCustomerService}
    />
  );

  const channelName =
    paymentMethod === "online" && selectedPaymentChannelCode
      ? paymentChannels.find((c) => c.code === selectedPaymentChannelCode)?.name
      : null;

  return (
    <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">2. 支付方式</h3>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck size={12} className="text-[var(--theme-success)]" /> 安全支付
        </span>
      </div>

      {isMobileSheet ? (
        <>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{METHOD_LABELS[paymentMethod]}</p>
              {channelName ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{channelName}</p>
              ) : null}
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </button>
          <ResponsiveSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="选择支付方式" height="auto">
            <div className="pb-2">{picker}</div>
          </ResponsiveSheet>
        </>
      ) : (
        picker
      )}
      {paymentTimeoutHint && paymentMethod === "online" ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{paymentTimeoutHint}</p>
      ) : null}
    </div>
  );
}
