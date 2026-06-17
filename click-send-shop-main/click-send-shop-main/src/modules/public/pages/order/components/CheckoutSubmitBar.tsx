import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import StoreAmountToken from "@/components/store/StoreAmountToken";
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
  const ctaText = disabled && disabledHint ? disabledHint : submitCtaLabel(paymentMethod, false);
  const blocked = disabled && Boolean(disabledHint);

  return (
    <div className="store-mobile-submit-bar fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3.5">
        {blocked ? (
          <span className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border border-[color-mix(in_srgb,var(--theme-warning)_28%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-warning)_8%,var(--theme-surface))] px-3.5 py-2.5">
            <span className="min-w-0 truncate text-[11px] font-semibold leading-tight text-[var(--theme-text-muted)]">
              {disabledHint}
            </span>
            <span className="text-[18px] font-extrabold leading-none text-[var(--theme-text)] sm:text-xl">待确认</span>
          </span>
        ) : (
          <StoreAmountToken
            label="实付金额"
            amount={<AnimatedNumber value={finalTotal} decimals={2} format={(n) => n.toFixed(2)} />}
            layout="stacked"
            className="flex-1 rounded-2xl px-3.5 py-2.5"
            labelClassName="text-[11px] leading-tight"
            amountClassName="text-[20px] sm:text-[22px]"
            currencyClassName="mr-1 text-[11px] sm:text-xs"
          />
        )}
        <LoadingButton
          state={submitting ? "loading" : "normal"}
          onClick={onSubmit}
          disabled={submitting || disabled}
          variant="solid"
          className="min-h-12 w-[9.75rem] shrink-0 rounded-2xl px-3 py-2 text-sm font-bold btn-theme-gradient theme-shadow disabled:opacity-60"
          loadingText={submitCtaLabel(paymentMethod, true)}
        >
          <span className="inline-flex min-w-0 items-center justify-center gap-1.5">
            <CreditCard size={16} strokeWidth={2.4} aria-hidden="true" />
            <span className="min-w-0 text-center leading-tight">{ctaText}</span>
          </span>
        </LoadingButton>
      </div>
    </div>
  );
}
