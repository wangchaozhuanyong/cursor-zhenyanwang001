import { useCallback, useMemo, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHomeTrackingSessionId } from "@/hooks/useHomeTrackingSessionId";
import * as productService from "@/services/productService";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import type { NewArrivalClickTarget } from "./newArrivalOps";
import HomeNewArrivalCard from "./HomeNewArrivalCard";

interface NewArrivalSectionProps {
  products: Product[];
  loading?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  displayCount?: number;
  showPrice?: boolean;
}

const DEFAULT_TITLE = "新品上市";
const DEFAULT_SUBTITLE = "最近上架好物，第一时间发现";

export default function NewArrivalSection({
  products,
  loading = false,
  className = "",
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  displayCount = 8,
  showPrice = true,
}: NewArrivalSectionProps) {
  const navigate = useNavigate();
  const sessionId = useHomeTrackingSessionId();
  const exposedProductIdsRef = useRef<Set<string>>(new Set());

  const items = useMemo(
    () => products.slice(0, Math.max(1, Number(displayCount) || 8)),
    [displayCount, products],
  );

  const trackClick = useCallback(
    (target: NewArrivalClickTarget, productId?: string, index?: number) => {
      void productService.trackHomeEngagement({
        module: "new_arrivals",
        event: "click",
        product_id: productId,
        session_id: sessionId,
        meta: { target, index },
      });
    },
    [sessionId],
  );

  const registerImpression = useCallback(
    (product: Product, index: number) => {
      if (!product.id || exposedProductIdsRef.current.has(product.id)) return;
      exposedProductIdsRef.current.add(product.id);
      void productService.trackHomeEngagement({
        module: "new_arrivals",
        event: "impression",
        product_id: product.id,
        session_id: sessionId,
        meta: { index },
      });
    },
    [sessionId],
  );

  if (!loading && items.length === 0) return null;

  return (
    <section className={cn("rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 md:p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-wide text-[var(--theme-text-on-surface)]">{title || DEFAULT_TITLE}</h2>
          <p className="mt-0.5 truncate text-xs text-[var(--theme-text-muted)]">{subtitle || DEFAULT_SUBTITLE}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            trackClick("new_arrivals_page");
            navigate("/new-arrivals");
          }}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--theme-text-muted)]"
        >
          查看更多
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[132px] shrink-0 snap-start overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] animate-pulse"
              >
                <div className="aspect-square w-full bg-[var(--theme-surface)]" />
                <div className="space-y-2 px-2 py-2">
                  <div className="h-3 w-4/5 rounded bg-[var(--theme-surface)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--theme-surface)]" />
                </div>
              </div>
            ))
          : items.map((product, index) => (
              <HomeNewArrivalCard
                key={product.id}
                product={product}
                index={index}
                showPrice={showPrice}
                registerImpression={registerImpression}
                onClick={(item, i) => trackClick("product", item.id, i)}
              />
            ))}
      </div>
    </section>
  );
}
