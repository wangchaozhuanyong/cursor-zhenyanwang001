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
    <div className="sf-next-checkout-submit-bar fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden" aria-live="polite">
      <div className="sf-next-checkout-submit-bar__inner mx-auto grid max-w-lg grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2">
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
          className="sf-next-checkout-submit-cta h-11 min-h-11 w-[8.75rem] shrink-0 rounded-xl px-2.5 py-0 text-sm font-bold btn-theme-gradient sf-next-theme-shadow disabled:opacity-60"
          loadingText={submitCtaLabel(paymentMethod, true)}
        >
          {ctaText}
        </LoadingButton>
      </div>
    </div>
  );
}
