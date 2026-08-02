import { storefrontV2Tokens as t } from "../design/tokens";

type StorefrontPriceProps = {
  amount: string | number;
  originalAmount?: string | number;
  className?: string;
  unavailable?: boolean;
};

export default function StorefrontPrice({ amount, originalAmount, className = "", unavailable = false }: StorefrontPriceProps) {
  return (
    <div className={`sf-next-price flex min-w-0 flex-wrap items-end gap-1.5 ${className}`}>
      {!unavailable ? <span className="sf-next-price__currency mb-px rounded-md bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] px-1.5 py-0.5 text-[10px] font-black leading-none text-[var(--theme-price)]">RM</span> : null}
      <span className={`${t.text.price} sf-next-price__amount`}>{amount}</span>
      {originalAmount ? <span className={`${t.text.originalPrice} sf-next-price__original`}>RM {originalAmount}</span> : null}
    </div>
  );
}
