import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  amount: ReactNode;
  /** sf-next-price__amount | sf-next-product-price | custom */
  amountClassName?: string;
  currencyClassName?: string;
  className?: string;
};

/** RM + amount with smaller currency symbol for storefront price hierarchy */
export default function StorePriceAmount({
  amount,
  amountClassName = "sf-next-price__amount",
  currencyClassName = "sf-next-price__currency mr-0.5 text-[11px] leading-none sm:text-xs",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "sf-next-price inline-flex items-baseline whitespace-nowrap text-[var(--theme-price)]",
        className,
      )}
    >
      <span className={currencyClassName}>RM</span>
      <span className={cn(amountClassName, "tabular-nums")}>{amount}</span>
    </span>
  );
}
