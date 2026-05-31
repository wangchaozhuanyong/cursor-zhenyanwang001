import { useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import PaymentMethodPicker, { type PaymentMethod } from "@/components/PaymentMethodPicker";
import type { PublicPaymentChannel } from "@/services/paymentService";
import { AppModal, usePreferBottomSheet } from "@/modules/micro-interactions";

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
  const isMobileSheet = usePreferBottomSheet("standard");
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
    <div className="store-checkout-card theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="store-checkout-step flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--theme-price)] text-xs font-bold text-white">2</span>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">支付方式</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">选择适合你的付款方式</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck size={12} className="text-[var(--theme-success)]" /> 安全支付
        </span>
      </div>

      {isMobileSheet ? (
        <>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="store-choice-row flex w-full items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{METHOD_LABELS[paymentMethod]}</p>
              {channelName ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{channelName}</p>
              ) : null}
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </button>
          <AppModal tier="standard" open={sheetOpen} onClose={() => setSheetOpen(false)} title="选择支付方式" height="auto">
            <div className="pb-2">{picker}</div>
          </AppModal>
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
