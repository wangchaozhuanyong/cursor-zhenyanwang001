import { useCallback, useEffect, useRef } from "react";
import { Flame, RefreshCw } from "lucide-react";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { HOME_PRODUCT_GRID_CLASS, HOME_SECTION_HEADER_MB } from "@/constants/homeLayout";
import { useHomeTrackingSessionId } from "@/hooks/useHomeTrackingSessionId";
import { trackEventLazy } from "@/services/trackEventLazy";
import ProductCardV2 from "@/modules/storefront-v2/product/ProductCardV2";
import ProductCardV2Skeleton from "@/modules/storefront-v2/product/ProductCardV2Skeleton";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { observeHomeCardImpression } from "./homeCardImpressionObserver";

interface HomeHotSalesSectionProps {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
  showRotate?: boolean;
  onRotate?: () => void;
  title?: string;
  showPrice?: boolean;
  className?: string;
}

export default function HomeHotSalesSection({
  products,
  loading = false,
  skeletonCount = 4,
  showRotate = false,
  onRotate,
  title = "今日热销",
  showPrice = true,
  className,
}: HomeHotSalesSectionProps) {
  const sessionId = useHomeTrackingSessionId();
  const exposedProductIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    exposedProductIdsRef.current.clear();
  }, [products]);

  const registerImpression = useCallback(
    (product: Product, _index: number) => {
      if (!product.id || exposedProductIdsRef.current.has(product.id)) return;
      exposedProductIdsRef.current.add(product.id);
      trackEventLazy({
        event_type: "product_impression",
        module: "hot_sales",
        product_id: product.id,
        session_id: sessionId,
      }, { deferMs: 9000 });
    },
    [sessionId],
  );

  if (!loading && products.length === 0) return null;

  return (
    <section className={className}>
      <div className={cn("flex items-center justify-between gap-2", HOME_SECTION_HEADER_MB)}>
        <h2 className="flex min-w-0 items-center gap-2 store-section-title tracking-widest text-[var(--theme-text-on-surface)]">
          <Flame className="h-5 w-5 shrink-0 text-[var(--theme-price)]" />
          {title}
        </h2>
        {showRotate ? (
          <UnifiedButton
            type="button"
            onClick={onRotate}
            className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]"
          >
            <RefreshCw size={12} />
            换一批
          </UnifiedButton>
        ) : null}
      </div>
      <div className={HOME_PRODUCT_GRID_CLASS}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <ProductCardV2Skeleton key={`hot-skeleton-${i}`} />
            ))
          : products.map((product, index) => (
              <TrackedHotProductCard
                key={product.id}
                product={product}
                index={index}
                showPrice={showPrice}
                registerImpression={registerImpression}
              />
            ))}
      </div>
    </section>
  );
}

function TrackedHotProductCard({
  product,
  index,
  showPrice,
  registerImpression,
}: {
  product: Product;
  index: number;
  showPrice: boolean;
  registerImpression: (product: Product, index: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    return observeHomeCardImpression(ref.current, () => registerImpression(product, index));
  }, [index, product, registerImpression]);

  return (
    <div ref={ref}>
      <ProductCardV2 product={product} index={index} showPrice={showPrice} />
    </div>
  );
}
