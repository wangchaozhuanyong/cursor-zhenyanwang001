import { useEffect, useMemo, useState, type ReactNode } from "react";
import SilkRefreshOverlay from "@/components/motion/SilkRefreshOverlay";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import ProductCardV2 from "@/modules/storefront-v2/product/ProductCardV2";
import ProductCardV2Skeleton from "@/modules/storefront-v2/product/ProductCardV2Skeleton";
import type { ProductCardSiteContext } from "@/components/ProductCard";

const INITIAL_PRODUCT_RENDER_LIMIT = 24;
const DEFERRED_PRODUCT_REVEAL_MS = 650;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

type SilkProductGridProps = {
  products: Product[];
  className: string;
  displayMode?: "theme" | "list";
  skeletonCount?: number;
  showFullSkeleton?: boolean;
  showSoftRefreshing?: boolean;
  emptyState?: ReactNode;
  /** 由列表页注入，避免每张卡重复订阅站点配置 */
  siteContext?: ProductCardSiteContext;
};

export default function SilkProductGrid({
  products,
  className,
  displayMode = "theme",
  skeletonCount = 8,
  showFullSkeleton = false,
  showSoftRefreshing = false,
  emptyState,
}: SilkProductGridProps) {
  const isListView = displayMode === "list";
  const shouldDeferList = products.length > INITIAL_PRODUCT_RENDER_LIMIT;
  const [renderAll, setRenderAll] = useState(!shouldDeferList);

  useEffect(() => {
    if (!shouldDeferList) {
      setRenderAll(true);
      return;
    }

    setRenderAll(false);
    const idleWindow = window as IdleWindow;
    const reveal = () => setRenderAll(true);

    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(reveal, { timeout: DEFERRED_PRODUCT_REVEAL_MS });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const timer = window.setTimeout(reveal, DEFERRED_PRODUCT_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [shouldDeferList, products]);

  const visibleProducts = useMemo(
    () => (renderAll ? products : products.slice(0, INITIAL_PRODUCT_RENDER_LIMIT)),
    [products, renderAll],
  );

  return (
    <div className="relative min-h-[12rem]">
      <SilkRefreshOverlay show={showSoftRefreshing} />
      <div className={cn(className, showSoftRefreshing && "opacity-95")}>
        {showFullSkeleton
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <ProductCardV2Skeleton key={`silk-skeleton-${i}`} variant={isListView ? "list" : "grid"} />
            ))
          : visibleProducts.map((product, index) => (
              <ProductCardV2
                key={product.id}
                product={product}
                index={index}
                variant={isListView ? "list" : "grid"}
                className="[content-visibility:auto] [contain-intrinsic-size:280px]"
              />
            ))}
        {!showFullSkeleton && products.length === 0 ? emptyState : null}
      </div>
    </div>
  );
}
