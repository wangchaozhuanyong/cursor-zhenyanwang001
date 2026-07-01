import { PackageSearch } from "lucide-react";
import StorefrontQuietLoading from "@/components/storefront-motion/StorefrontQuietLoading";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Product } from "@/types/product";
import ProductCardV2 from "../product/ProductCardV2";
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
  previewLimit?: number;
  className?: string;
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
  previewLimit,
  className,
  onNavigate,
}: HomeProductSectionV2Props) {
  const visibleProducts = previewLimit && previewLimit > 0 ? products.slice(0, previewLimit) : products;

  return (
    <section className={["sf-next-product-shelf min-w-0", className].filter(Boolean).join(" ")}>
      <div className="sf-next-product-shelf__header">
        <StorefrontTitleRow
          title={title}
          subtitle={subtitle}
          subtitlePlacement="below"
          action={(
            <UnifiedButton
              type="button"
              onClick={() => onNavigate(actionPath)}
              className="sf-next-product-shelf__action"
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
        <div className="sf-next-product-grid sf-next-product-shelf__grid">
          {visibleProducts.map((product, index) => (
              <ProductCardV2
                key={product.id}
                product={product}
                index={index}
                showPrice={showPrice}
              />
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
