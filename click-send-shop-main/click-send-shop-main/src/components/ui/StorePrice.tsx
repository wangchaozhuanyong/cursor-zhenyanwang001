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
  const sizeClass = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-sm";
  const weightClass = style === "normal" ? "font-semibold" : "font-extrabold";

  return (
    <div className={cn("inline-flex max-w-full flex-nowrap items-baseline gap-1", className)} style={{ whiteSpace: "nowrap" }}>
      <span className={cn(sizeClass, weightClass, "inline-flex whitespace-nowrap leading-none text-[var(--theme-price)]")} style={{ whiteSpace: "nowrap" }}>
        {showCurrency ? "RM\u00A0" : ""}
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
