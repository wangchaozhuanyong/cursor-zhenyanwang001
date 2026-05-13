interface CheckoutStepBarProps {
  className?: string;
}

const STEPS = ["地址", "配送", "支付", "优惠券", "确认"];

export default function CheckoutStepBar({ className = "" }: CheckoutStepBarProps) {
  return (
    <div className={`theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 ${className}`}>
      <p className="mb-2 text-xs font-semibold text-[var(--theme-text-muted)]">结算步骤</p>
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((step, index) => (
          <div key={step} className="flex flex-col items-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[11px] font-bold text-white">
              {index + 1}
            </span>
            <span className="text-[11px] text-[var(--theme-text)]">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
