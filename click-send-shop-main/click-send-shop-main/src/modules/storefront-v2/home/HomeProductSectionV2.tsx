import { ArrowRight } from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Product } from "@/types/product";
import ProductCardV2 from "../product/ProductCardV2";
import ProductCardV2Skeleton from "../product/ProductCardV2Skeleton";
import StorefrontTitleRow from "../components/StorefrontTitleRow";

type HomeProductSectionV2Props = {
  title: string;
  subtitle?: string;
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
  actionLabel?: string;
  actionPath?: string;
  emptyText?: string;
  emptyActionLabel?: string;
  showPrice?: boolean;
  onNavigate: (path: string) => void;
};

export default function HomeProductSectionV2({
  title,
  subtitle,
  products,
  loading = false,
  skeletonCount = 4,
  actionLabel = "更多",
  actionPath = "/categories",
  emptyText = "暂无商品",
  emptyActionLabel = "去全部分类",
  showPrice = true,
  onNavigate,
}: HomeProductSectionV2Props) {
  return (
    <section className="min-w-0">
      <StorefrontTitleRow
        title={title}
        subtitle={subtitle}
        action={(
          <UnifiedButton
            type="button"
            onClick={() => onNavigate(actionPath)}
            className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-2.5 py-1.5 text-xs font-black text-[var(--theme-primary)]"
          >
            {actionLabel}
            <ArrowRight size={14} />
          </UnifiedButton>
        )}
      />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: skeletonCount }).map((_, index) => (
              <ProductCardV2Skeleton key={`home-v2-skeleton-${title}-${index}`} />
            ))
          : products.map((product, index) => (
              <ProductCardV2
                key={product.id}
                product={product}
                index={index}
                showPrice={showPrice}
                className="[content-visibility:auto] [contain-intrinsic-size:280px]"
              />
            ))}
      </div>
      {!loading && products.length === 0 ? (
        <div className="rounded-[1.125rem] border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--theme-text-muted)]">{emptyText}</p>
          <UnifiedButton
            type="button"
            onClick={() => onNavigate(actionPath)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-3 py-2 text-xs font-black text-[var(--theme-primary)]"
          >
            {emptyActionLabel}
            <ArrowRight size={14} />
          </UnifiedButton>
        </div>
      ) : null}
    </section>
  );
}
