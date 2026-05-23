import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  amount: ReactNode;
  /** store-price-card | store-price-detail | custom */
  amountClassName?: string;
  currencyClassName?: string;
  className?: string;
};

/** RM + amount with smaller currency symbol for storefront price hierarchy */
export default function StorePriceAmount({
  amount,
  amountClassName = "store-price-card",
  currencyClassName = "mr-0.5 text-[11px] font-bold leading-none sm:text-xs",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap text-[var(--theme-price)]",
        className,
      )}
    >
      <span className={currencyClassName}>RM</span>
      <span className={cn(amountClassName, "tabular-nums")}>{amount}</span>
    </span>
  );
}
