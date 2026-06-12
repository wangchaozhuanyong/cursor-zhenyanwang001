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
        <div className="min-w-0 pr-3">
          <p className="text-xs text-muted-foreground">{disabled && disabledHint ? disabledHint : "实付"}</p>
          <p className="whitespace-nowrap text-[18px] font-extrabold text-[var(--theme-price)]">
            <AnimatedNumber value={finalTotal} decimals={2} format={(n) => `RM ${n.toFixed(2)}`} />
          </p>
        </div>
        <LoadingButton
          state={submitting ? "loading" : "normal"}
          onClick={onSubmit}
          disabled={submitting || disabled}
          variant="solid"
          className="min-h-12 min-w-[11rem] rounded-full px-3 py-2 text-sm font-bold btn-theme-gradient theme-shadow disabled:opacity-60"
          loadingText={submitCtaLabel(paymentMethod, true)}
        >
          <span className="inline-flex min-w-0 items-center gap-2.5">
            <span className="whitespace-nowrap">{submitCtaLabel(paymentMethod, false)}</span>
            <span className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-[var(--theme-surface)] px-3 text-[13px] font-extrabold leading-none text-[var(--theme-price)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--theme-price)_18%,transparent),0_1px_2px_rgba(0,0,0,0.10)]">
              <AnimatedNumber value={finalTotal} decimals={2} format={(n) => `RM ${n.toFixed(2)}`} />
            </span>
          </span>
        </LoadingButton>
      </div>
    </div>
  );
}
