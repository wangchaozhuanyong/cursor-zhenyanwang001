import { useEffect, useMemo, useState, type ReactNode } from "react";
import SilkRefreshOverlay from "@/components/motion/SilkRefreshOverlay";
import StorefrontQuietLoading from "@/components/storefront-motion/StorefrontQuietLoading";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import ProductCardV2 from "@/modules/storefront-v2/product/ProductCardV2";
import type { ProductCardSiteContext } from "@/components/ProductCard";

const INITIAL_PRODUCT_RENDER_LIMIT = 24;
const DEFERRED_PRODUCT_REVEAL_MS = 650;
const SOFT_REFRESH_NOTICE_DELAY_MS = 450;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

type SilkProductGridProps = {
  products: Product[];
  className: string;
  shellClassName?: string;
  displayMode?: "theme" | "list";
  showQuietLoading?: boolean;
  showSoftRefreshing?: boolean;
  emptyState?: ReactNode;
  itemKeyPrefix?: string;
  /** 由列表页注入，避免每张卡重复订阅站点配置 */
  siteContext?: ProductCardSiteContext;
};

export default function SilkProductGrid({
  products,
  className,
  shellClassName,
  displayMode = "theme",
  showQuietLoading = false,
  showSoftRefreshing = false,
  emptyState,
  itemKeyPrefix = "product",
}: SilkProductGridProps) {
  const isListView = displayMode === "list";
  const shouldDeferList = products.length > INITIAL_PRODUCT_RENDER_LIMIT;
  const [renderAll, setRenderAll] = useState(!shouldDeferList);
  const [showDelayedRefreshNotice, setShowDelayedRefreshNotice] = useState(false);

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

  useEffect(() => {
    if (!showSoftRefreshing) {
      setShowDelayedRefreshNotice(false);
      return;
    }

    const timer = window.setTimeout(() => setShowDelayedRefreshNotice(true), SOFT_REFRESH_NOTICE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [showSoftRefreshing]);

  const visibleProducts = useMemo(
    () => (renderAll ? products : products.slice(0, INITIAL_PRODUCT_RENDER_LIMIT)),
    [products, renderAll],
  );

  return (
    <div className={cn("relative min-h-[12rem]", shellClassName)}>
      <SilkRefreshOverlay show={showDelayedRefreshNotice} label="正在刷新商品" />
      {showQuietLoading ? (
        <StorefrontQuietLoading
          label="商品加载中"
          className={cn(
            "sf-motion-inline-loading--product-grid",
            isListView && "sf-motion-inline-loading--product-list",
          )}
        />
      ) : (
        <div className={cn(className, showDelayedRefreshNotice && "opacity-95")}>
          {visibleProducts.map((product, index) => (
              <ProductCardV2
                key={`${itemKeyPrefix}:${index}:${product.id}`}
                product={product}
                index={index}
                variant={isListView ? "list" : "grid"}
              />
          ))}
          {products.length === 0 ? emptyState : null}
        </div>
      )}
    </div>
  );
}
