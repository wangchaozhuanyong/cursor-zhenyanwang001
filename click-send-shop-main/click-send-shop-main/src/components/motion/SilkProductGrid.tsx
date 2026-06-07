import { useEffect, useMemo, useState, type ReactNode } from "react";
import ProductCard, { type ProductCardSiteContext } from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import SilkRefreshOverlay from "@/components/motion/SilkRefreshOverlay";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

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
  siteContext,
}: SilkProductGridProps) {
  const isListView = displayMode === "list";
  const { themeConfig } = useThemeRuntime();
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
              <ProductCardSkeleton key={`silk-skeleton-${i}`} list={isListView} />
            ))
          : visibleProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                displayMode={displayMode}
                siteContext={siteContext}
                themeConfig={themeConfig}
                animate={!shouldDeferList || index < 8}
                lightMedia={shouldDeferList && index >= 4}
              />
            ))}
        {!showFullSkeleton && products.length === 0 ? emptyState : null}
      </div>
    </div>
  );
}
