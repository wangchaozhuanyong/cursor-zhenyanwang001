import { PackageSearch } from "lucide-react";
import StorefrontQuietLoading from "@/components/storefront-motion/StorefrontQuietLoading";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Product } from "@/types/product";
import ProductCardV2 from "../product/ProductCardV2";
import CuratedLifeProductCard from "../product/CuratedLifeProductCard";
import StorefrontTitleRow from "../components/StorefrontTitleRow";

type HomeProductSectionV2Props = {
  title: string;
  subtitle?: string;
  products: Product[];
  loading?: boolean;
  actionLabel?: string;
  actionPath?: string;
  emptyText?: string;
  emptyActionLabel?: string;
  showPrice?: boolean;
  showQuickAction?: boolean;
  previewLimit?: number;
  className?: string;
  variant?: "default" | "curated";
  onNavigate: (path: string) => void;
};

export default function HomeProductSectionV2({
  title,
  subtitle,
  products,
  loading = false,
  actionLabel = "更多",
  actionPath = "/categories",
  emptyText = "暂无商品",
  emptyActionLabel = "去分类",
  showPrice = true,
  showQuickAction = true,
  previewLimit,
  className,
  variant = "default",
  onNavigate,
}: HomeProductSectionV2Props) {
  const visibleProducts = previewLimit && previewLimit > 0 ? products.slice(0, previewLimit) : products;

  return (
    <section className={["sf-next-product-shelf min-w-0", className].filter(Boolean).join(" ")}>
      <div className={variant === "curated" ? "curated-life-product-shelf__header" : "sf-next-product-shelf__header"}>
        <StorefrontTitleRow
          title={title}
          subtitle={subtitle}
          subtitlePlacement="below"
          action={(
            <UnifiedButton
              type="button"
              onClick={() => onNavigate(actionPath)}
              className={variant === "curated" ? "curated-life-section-heading__action" : "sf-next-product-shelf__action"}
            >
              <PackageSearch size={14} aria-hidden />
              <span>{actionLabel}</span>
            </UnifiedButton>
          )}
        />
      </div>
      {loading ? (
        <StorefrontQuietLoading label={`${title}加载中`} className="sf-motion-inline-loading--shelf" />
      ) : (
        <div className={variant === "curated" ? "curated-life-product-grid" : "sf-next-product-grid sf-next-product-shelf__grid"}>
          {visibleProducts.map((product, index) => (
            variant === "curated" ? (
              <CuratedLifeProductCard
                key={product.id}
                product={product}
                index={index}
              />
            ) : (
              <ProductCardV2
                key={product.id}
                product={product}
                index={index}
                imageLoading="lazy"
                showPrice={showPrice}
                showQuickAction={showQuickAction}
              />
            )
          ))}
        </div>
      )}
      {!loading && products.length === 0 ? (
        <div className="sf-next-product-shelf__empty">
          <p>{emptyText}</p>
          <UnifiedButton
            type="button"
            onClick={() => onNavigate(actionPath)}
            className="sf-next-product-shelf__empty-action"
          >
            <PackageSearch size={14} aria-hidden />
            <span>{emptyActionLabel}</span>
          </UnifiedButton>
        </div>
      ) : null}
    </section>
  );
}
