import { useCallback, useEffect, useRef } from "react";
import { Flame, RefreshCw } from "lucide-react";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { HOME_PRODUCT_GRID_CLASS, HOME_SECTION_HEADER_MB } from "@/constants/homeLayout";
import { useHomeTrackingSessionId } from "@/hooks/useHomeTrackingSessionId";
import { trackEventLazy } from "@/services/trackEventLazy";
import HomeGridProductCard from "./HomeGridProductCard";
import HomeGridProductCardSkeleton from "./HomeGridProductCardSkeleton";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface HomeHotSalesSectionProps {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
  showRotate?: boolean;
  onRotate?: () => void;
  showPrice?: boolean;
  className?: string;
}

export default function HomeHotSalesSection({
  products,
  loading = false,
  skeletonCount = 4,
  showRotate = false,
  onRotate,
  showPrice = true,
  className,
}: HomeHotSalesSectionProps) {
  const sessionId = useHomeTrackingSessionId();
  const exposedProductIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    exposedProductIdsRef.current.clear();
  }, [products]);

  const registerImpression = useCallback(
    (product: Product, index: number) => {
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
          今日热销
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
              <HomeGridProductCardSkeleton key={`hot-skeleton-${i}`} />
            ))
          : products.map((product, index) => (
              <HomeGridProductCard
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
