import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import { AnimatedNumber, LoadingButton } from "@/modules/micro-interactions";
import { CreditCard } from "lucide-react";
import { submitCtaLabel } from "../utils/checkoutText";

interface CheckoutSubmitBarProps {
  finalTotal: number;
  paymentMethod: PaymentMethod;
  submitting: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onSubmit: () => void;
}

export function CheckoutSubmitBar({
  finalTotal,
  paymentMethod,
  submitting,
  disabled = false,
  disabledHint,
  onSubmit,
}: CheckoutSubmitBarProps) {
  const ctaText = disabled && disabledHint ? "待确认" : submitCtaLabel(paymentMethod, false);
  const blocked = disabled && Boolean(disabledHint);

  return (
    <div className="sf-next-checkout-submit-bar md:hidden" aria-live="polite">
      <div className="sf-next-checkout-submit-bar__inner">
        <span
          className={`sf-next-checkout-submit-total${blocked ? " sf-next-checkout-submit-total--blocked" : ""}`}
          role={blocked ? "status" : undefined}
        >
          <span className="sf-next-checkout-submit-meta">
            <span className="sf-next-checkout-submit-label">实付金额</span>
            {blocked && disabledHint ? (
              <span className="sf-next-checkout-submit-hint">{disabledHint}</span>
            ) : null}
          </span>
          <StorePriceAmount
            amount={<AnimatedNumber value={finalTotal} decimals={2} format={(n) => n.toFixed(2)} />}
            amountClassName="sf-next-checkout-submit-amount"
            currencyClassName="sf-next-checkout-submit-currency"
          />
        </span>
        <LoadingButton
          state={submitting ? "loading" : "normal"}
          onClick={onSubmit}
          disabled={submitting || disabled}
          variant="solid"
          leftIcon={<CreditCard size={16} strokeWidth={2.4} aria-hidden="true" />}
          className="sf-next-checkout-submit-cta"
          loadingText={submitCtaLabel(paymentMethod, true)}
        >
          {ctaText}
        </LoadingButton>
      </div>
    </div>
  );
}
