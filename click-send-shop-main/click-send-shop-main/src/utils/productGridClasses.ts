import type { ProductCardVariant } from "@/types/theme";
import { cn } from "@/lib/utils";

/** 商品列表网格：紧凑横版在窄屏用单列，避免价格与销量文字挤叠 */
export function getProductGridClassName(variant: ProductCardVariant | undefined) {
  const isCompact = variant === "compact";
  return cn(
    "grid gap-3 pt-1 sm:gap-4",
    isCompact
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  );
}

export function getProductGridEmptyColSpan(variant: ProductCardVariant | undefined) {
  const isCompact = variant === "compact";
  return isCompact
    ? "col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-3"
    : "col-span-2 md:col-span-3 lg:col-span-4";
}
