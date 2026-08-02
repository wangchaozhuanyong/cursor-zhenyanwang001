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

const PAYMENT_TRIGGER_CLASS = "sf-next-checkout-payment-trigger";

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
    <div className="sf-next-checkout-card">
      <div className="sf-next-checkout-card__head">
        <div>
          <h2 className="sf-next-checkout-section-title">{copy.title}</h2>
        </div>
        <span className="sf-next-checkout-secure-label">
          <ShieldCheck size={12} /> {copy.secure}
        </span>
      </div>

      {isMobileSheet ? (
        <>
          <UnifiedButton
            type="button"
            onClick={() => setSheetOpen(true)}
            className={PAYMENT_TRIGGER_CLASS}
          >
            <div className="sf-next-checkout-payment-copy">
              <p>{copy.selected}</p>
              <strong>{copy.methodLabels[paymentMethod]}</strong>
              {channelName ? (
                <span>{channelName}</span>
              ) : (
                <span>{copy.switchHint}</span>
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
        <p className="sf-next-checkout-section-message">{paymentTimeoutHint}</p>
      ) : null}
    </div>
  );
}
