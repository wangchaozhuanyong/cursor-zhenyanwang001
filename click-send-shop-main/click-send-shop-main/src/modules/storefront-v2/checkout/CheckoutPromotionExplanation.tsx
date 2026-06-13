import { BadgeCheck } from "lucide-react";

type DiscountLine = {
  type: string;
  label: string;
  amount: number;
};

type PointsBonusLine = {
  type: string;
  label: string;
  multiplier_percent?: number;
};

type CheckoutPromotionExplanationProps = {
  discountLines?: DiscountLine[];
  pointsBonusLines?: PointsBonusLine[];
  className?: string;
};

export default function CheckoutPromotionExplanation({
  discountLines = [],
  pointsBonusLines = [],
  className = "",
}: CheckoutPromotionExplanationProps) {
  if (!discountLines.length && !pointsBonusLines.length) return null;

  return (
    <section
      className={`rounded-2xl border border-[color-mix(in_srgb,var(--theme-success)_24%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-success)_8%,var(--theme-surface))] px-3 py-3 ${className}`}
      aria-label="优惠说明"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-success)_14%,var(--theme-surface))] text-[var(--theme-success)]">
          <BadgeCheck size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--theme-text)]">已按当前订单自动匹配优惠</p>
          <div className="mt-1 space-y-1 text-xs leading-5 text-[var(--theme-text-muted)]">
            {discountLines.map((line) => (
              <p key={`${line.type}-${line.label}`}>{line.label}：已减 RM {money(line.amount)}</p>
            ))}
            {pointsBonusLines.map((line) => (
              <p key={`${line.type}-${line.label}`}>{line.label}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function money(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}
