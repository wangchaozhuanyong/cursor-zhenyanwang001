import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import { AnimatedNumber, LoadingButton } from "@/modules/micro-interactions";
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
  return (
    <div className="store-mobile-submit-bar fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-xs text-muted-foreground">{disabled && disabledHint ? disabledHint : "实付"}</p>
          <p className="text-[18px] font-extrabold text-[var(--theme-price)]">
            <AnimatedNumber value={finalTotal} decimals={2} format={(n) => `RM ${n.toFixed(2)}`} />
          </p>
        </div>
        <LoadingButton
          state={submitting ? "loading" : "normal"}
          onClick={onSubmit}
          disabled={submitting || disabled}
          variant="solid"
          className="min-h-12 rounded-full px-8 py-3 text-sm font-bold btn-theme-gradient theme-shadow disabled:opacity-60"
          loadingText={submitCtaLabel(paymentMethod, true)}
        >
          {submitCtaLabel(paymentMethod, false)}
        </LoadingButton>
      </div>
    </div>
  );
}
