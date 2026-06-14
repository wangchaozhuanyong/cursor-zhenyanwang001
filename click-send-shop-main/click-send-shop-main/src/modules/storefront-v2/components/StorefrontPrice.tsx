import { storefrontV2Tokens as t } from "../design/tokens";

type StorefrontPriceProps = {
  amount: string | number;
  originalAmount?: string | number;
  className?: string;
};

export default function StorefrontPrice({ amount, originalAmount, className = "" }: StorefrontPriceProps) {
  return (
    <div className={`flex min-w-0 flex-wrap items-end gap-1.5 ${className}`}>
      <span className="mb-px rounded-md bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] px-1.5 py-0.5 text-[10px] font-black leading-none text-[var(--theme-price)]">
        RM
      </span>
      <span className={t.text.price}>{amount}</span>
      {originalAmount ? <span className={t.text.originalPrice}>RM {originalAmount}</span> : null}
    </div>
  );
}
