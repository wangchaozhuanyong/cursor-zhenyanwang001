import type { ReactNode } from "react";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import SilkRefreshOverlay from "@/components/motion/SilkRefreshOverlay";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type SilkProductGridProps = {
  products: Product[];
  className: string;
  displayMode?: "theme" | "list";
  skeletonCount?: number;
  showFullSkeleton?: boolean;
  showSoftRefreshing?: boolean;
  emptyState?: ReactNode;
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

  return (
    <div className="relative min-h-[12rem]">
      <SilkRefreshOverlay show={showSoftRefreshing} />
      <div className={cn(className, showSoftRefreshing && "opacity-95")}>
        {showFullSkeleton
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <ProductCardSkeleton key={`silk-skeleton-${i}`} list={isListView} />
            ))
          : products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                displayMode={displayMode}
              />
            ))}
        {!showFullSkeleton && products.length === 0 ? emptyState : null}
      </div>
    </div>
  );
}
