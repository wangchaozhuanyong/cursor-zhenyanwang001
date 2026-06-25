import { useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import PaymentMethodPicker, { type PaymentMethod } from "@/components/PaymentMethodPicker";
import type { PublicPaymentChannel } from "@/services/paymentService";
import { AppModal, usePreferBottomSheet } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

const CHECKOUT_PAYMENT_COPY: Record<PublicLocale, {
  methodLabels: Record<PaymentMethod, string>;
  disabledHint: string;
  title: string;
  secure: string;
  selected: string;
  switchHint: string;
  sheetTitle: string;
}> = {
  zh: {
    methodLabels: {
      online: "在线支付",
      reward_wallet: "返现钱包",
      whatsapp: "联系客服",
    },
    disabledHint: "商户暂未开通在线支付，请选择联系客服",
    title: "支付方式",
    secure: "安全支付",
    selected: "已选支付方式",
    switchHint: "点击可切换付款方式",
    sheetTitle: "选择支付方式",
  },
  en: {
    methodLabels: {
      online: "Online payment",
      reward_wallet: "Reward wallet",
      whatsapp: "Contact support",
    },
    disabledHint: "Online payment is not enabled. Please contact support.",
    title: "Payment method",
    secure: "Secure payment",
    selected: "Selected payment method",
    switchHint: "Tap to switch payment method",
    sheetTitle: "Choose payment method",
  },
};

const PAYMENT_TRIGGER_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--theme-price)_55%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_18%,var(--theme-surface))] px-4 py-3.5 text-left shadow-sm ring-1 ring-[color-mix(in_srgb,var(--theme-price)_16%,transparent)] transition-all hover:border-[color-mix(in_srgb,var(--theme-price)_70%,var(--theme-border))] hover:bg-[color-mix(in_srgb,var(--theme-price)_22%,var(--theme-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-price)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-surface)]";

interface CheckoutPaymentMethodProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  paymentTimeoutHint?: string | null;
  paymentConfigLoaded: boolean;
  paymentChannels: PublicPaymentChannel[];
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
  rewardBalance,
  selectedPaymentChannelCode,
  onPaymentChannelChange,
  showOnline,
  showCustomerService,
}: CheckoutPaymentMethodProps) {
  const isMobileSheet = usePreferBottomSheet("standard");
  const { locale } = usePublicLocale();
  const copy = CHECKOUT_PAYMENT_COPY[locale];
  const [sheetOpen, setSheetOpen] = useState(false);

  const picker = (
    <PaymentMethodPicker
      value={paymentMethod}
      onChange={onPaymentMethodChange}
      onlineDisabled={paymentConfigLoaded && paymentChannels.length === 0}
      onlineDisabledHint={copy.disabledHint}
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
    <div className="sf-next-checkout-card rounded-[20px] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[var(--theme-surface)] p-4 shadow-[0_14px_38px_rgba(65,45,28,0.08)] md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-foreground md:text-base">{copy.title}</h3>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck size={12} className="text-[var(--theme-success)]" /> {copy.secure}
        </span>
      </div>

      {isMobileSheet ? (
        <>
          <UnifiedButton
            type="button"
            onClick={() => setSheetOpen(true)}
            className={PAYMENT_TRIGGER_CLASS}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-theme-price">{copy.selected}</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{copy.methodLabels[paymentMethod]}</p>
              {channelName ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{channelName}</p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">{copy.switchHint}</p>
              )}
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </UnifiedButton>
          <AppModal tier="standard" open={sheetOpen} onClose={() => setSheetOpen(false)} title={copy.sheetTitle} height="auto">
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
