import { storefrontV2Tokens as t } from "../design/tokens";

type StorefrontPriceProps = {
  amount: string | number;
  originalAmount?: string | number;
  className?: string;
};

export default function StorefrontPrice({ amount, originalAmount, className = "" }: StorefrontPriceProps) {
  return (
    <div className={`flex min-w-0 items-end gap-1.5 ${className}`}>
      <span className="text-[10px] font-bold text-[var(--theme-price)]">RM</span>
      <span className={t.text.price}>{amount}</span>
      {originalAmount ? <span className={t.text.originalPrice}>RM {originalAmount}</span> : null}
    </div>
  );
}
