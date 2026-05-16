import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import { submitCtaLabel } from "../utils/checkoutText";

interface CheckoutSubmitBarProps {
  finalTotal: number;
  paymentMethod: PaymentMethod;
  submitting: boolean;
  onSubmit: () => void;
}

export function CheckoutSubmitBar({ finalTotal, paymentMethod, submitting, onSubmit }: CheckoutSubmitBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-xs text-muted-foreground">合计</p>
          <p className="text-xl font-bold text-[var(--theme-price)]">RM {finalTotal}</p>
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-full px-8 py-3.5 text-sm font-bold text-white theme-shadow transition-all active:scale-[0.97] disabled:opacity-60"
          style={{ background: "var(--theme-gradient)" }}
        >
          {submitCtaLabel(paymentMethod, submitting)}
        </button>
      </div>
    </div>
  );
}
