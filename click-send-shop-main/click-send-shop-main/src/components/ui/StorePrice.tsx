import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import type { PriceStyle } from "@/types/theme";

interface StorePriceProps {
  price: number | string;
  originalPrice?: number | string;
  size?: "sm" | "md" | "lg";
  showCurrency?: boolean;
  priceStyle?: PriceStyle;
  className?: string;
}

function toMoney(v: number | string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(2).replace(/\.00$/, "");
}

export default function StorePrice({
  price,
  originalPrice,
  size = "md",
  showCurrency = true,
  priceStyle,
  className,
}: StorePriceProps) {
  const { themeConfig } = useThemeRuntime();
  const style = priceStyle ?? themeConfig.priceStyle;
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  const weightClass = style === "normal" ? "font-semibold" : "font-extrabold";

  return (
    <div className={cn("flex flex-wrap items-baseline gap-1.5", className)}>
      <span className={cn(sizeClass, weightClass, "leading-none text-[var(--theme-price)]")}>
        {showCurrency ? "RM " : ""}
        {toMoney(price)}
      </span>
      {originalPrice !== undefined && Number(originalPrice) > Number(price) && (
        <span className="text-xs text-[var(--theme-muted)] line-through">
          {showCurrency ? "RM " : ""}
          {toMoney(originalPrice)}
        </span>
      )}
    </div>
  );
}
