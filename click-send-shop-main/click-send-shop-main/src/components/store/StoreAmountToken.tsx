import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import StorePriceAmount from "./StorePriceAmount";

type StoreAmountTokenLayout = "inline" | "stacked";

type StoreAmountTokenProps = {
  label?: ReactNode;
  amount: ReactNode;
  layout?: StoreAmountTokenLayout;
  className?: string;
  labelClassName?: string;
  amountClassName?: string;
  currencyClassName?: string;
};

export default function StoreAmountToken({
  label,
  amount,
  layout = "inline",
  className,
  labelClassName,
  amountClassName,
  currencyClassName,
}: StoreAmountTokenProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2",
        layout === "stacked" ? "flex-col items-start gap-1" : "items-center justify-between gap-2",
        className,
      )}
    >
      {label ? (
        <span className={cn("min-w-0 text-xs font-medium leading-none text-[var(--theme-text-muted)]", labelClassName)}>
          {label}
        </span>
      ) : null}
      <StorePriceAmount
        amount={amount}
        amountClassName={cn("text-base font-extrabold leading-none", amountClassName)}
        currencyClassName={cn("mr-0.5 text-xs font-semibold leading-none", currencyClassName)}
      />
    </span>
  );
}
