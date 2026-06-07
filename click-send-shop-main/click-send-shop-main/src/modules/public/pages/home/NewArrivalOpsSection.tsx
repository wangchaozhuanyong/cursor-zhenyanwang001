import { useCallback, useMemo, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHomeTrackingSessionId } from "@/hooks/useHomeTrackingSessionId";
import * as productService from "@/services/productService";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { HOME_SECTION_HEADER_MB } from "@/constants/homeLayout";
import type { NewArrivalClickTarget } from "./newArrivalOps";
import HomeNewArrivalCard from "./HomeNewArrivalCard";
import {
  HOME_NEW_ARRIVAL_CARD_WIDTH_CLASS,
  HOME_PRODUCT_CARD_SHELL,
  HOME_PRODUCT_CARD_MEDIA,
  HOME_PRODUCT_IMAGE_PRODUCT_CLASS,
  HOME_PRODUCT_INFO_CLASS,
} from "@/constants/homeProductCard";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface NewArrivalSectionProps {
  products: Product[];
  loading?: boolean;
  className?: string;
  title?: string;
  exactTitle?: boolean;
  displayCount?: number;
  showPrice?: boolean;
}

const DEFAULT_TITLE = "新品上市";

export default function NewArrivalSection({
  products,
  loading = false,
  className = "",
  title = DEFAULT_TITLE,
  exactTitle = false,
  displayCount = 8,
  showPrice = true,
}: NewArrivalSectionProps) {
  const navigate = useNavigate();
  const sessionId = useHomeTrackingSessionId();
  const exposedProductIdsRef = useRef<Set<string>>(new Set());
  const trimmedTitle = title?.trim();
  const normalizedTitle = exactTitle
    ? trimmedTitle || DEFAULT_TITLE
    : !trimmedTitle || trimmedTitle === "新品"
      ? DEFAULT_TITLE
      : trimmedTitle;

  const items = useMemo(
    () => products.slice(0, Math.min(8, Math.max(6, Number(displayCount) || 8))),
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
    <section
      className={cn(
        "rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-3 md:py-4",
        className,
      )}
    >
      <div className={cn("flex items-center justify-between gap-3 px-3", HOME_SECTION_HEADER_MB)}>
        <div className="min-w-0">
          <h2 className="store-section-title tracking-wide text-[var(--theme-text-on-surface)]">{normalizedTitle}</h2>
        </div>
        <UnifiedButton
          type="button"
          onClick={() => {
            trackClick("new_arrivals_page");
            navigate("/new-arrivals");
          }}
          className="inline-flex min-h-9 shrink-0 items-center rounded-full px-2 text-xs font-semibold text-[var(--theme-text-muted)]"
        >
          查看更多
          <ChevronRight size={14} />
        </UnifiedButton>
      </div>

      <div className="no-scrollbar flex items-start snap-x snap-mandatory gap-2 overflow-x-auto px-2 pb-1">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  HOME_PRODUCT_CARD_SHELL,
                  HOME_NEW_ARRIVAL_CARD_WIDTH_CLASS,
                  "animate-pulse",
                )}
              >
                <div className={cn(HOME_PRODUCT_CARD_MEDIA, HOME_PRODUCT_IMAGE_PRODUCT_CLASS, "bg-[var(--theme-bg)]")} />
                <div className={cn(HOME_PRODUCT_INFO_CLASS, "space-y-2")}>
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
