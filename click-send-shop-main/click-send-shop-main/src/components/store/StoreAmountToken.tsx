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
        "inline-flex min-w-0 rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_24%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_7%,var(--theme-surface))] px-3 py-2 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sf-surface)_52%,transparent)]",
        layout === "stacked" ? "flex-col items-start gap-1" : "items-center justify-between gap-2",
        className,
      )}
    >
      {label ? (
        <span className={cn("min-w-0 text-[11px] font-semibold leading-none text-[var(--theme-text-muted)]", labelClassName)}>
          {label}
        </span>
      ) : null}
      <StorePriceAmount
        amount={amount}
        amountClassName={cn("text-base font-extrabold leading-none", amountClassName)}
        currencyClassName={cn("mr-0.5 text-[10px] font-bold leading-none", currencyClassName)}
      />
    </span>
  );
}
