import { useNavigate } from "react-router-dom";
import type { Product } from "@/types/product";
import Reveal from "@/components/Reveal";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { ProgressiveImage } from "@/modules/micro-interactions";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import ProductTagList from "@/components/ProductTagList";
import StoreBadge from "@/components/ui/StoreBadge";
import StorePrice from "@/components/ui/StorePrice";
import { productSalesLabel } from "@/utils/productSales";
import { productCoverForList } from "@/utils/uploadImageVariant";
import { trackEvent } from "@/services/analyticsService";

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const cardCenter = themeConfig.cardTextAlign === "center";
  const cardVariant = themeConfig.productCardVariant ?? "standard";
  const defaultVariant = product.default_variant ?? (product.variants?.length === 1 ? product.variants[0] : null);
  const displayStock = Number(defaultVariant?.stock ?? product.stock ?? 0);
  const soldOut = displayStock <= 0;
  const coverSrc = productCoverForList(product.cover_image);
  const salesCount = Math.max(0, Number(product.sales_count) || 0);

  const openDetail = (module: string) => {
    void trackEvent({ event_type: "product_click", module, product_id: product.id });
    navigate(`/product/${product.id}`);
  };

  const nameRow = (
    <h3
      className={`line-clamp-2 text-[13px] font-medium leading-snug text-[var(--theme-text)] ${
        cardCenter ? "text-center" : ""
      }`}
    >
      {product.name}
    </h3>
  );

  const metaRow = (
    <div className="flex w-full items-end justify-between gap-2">
      <StorePrice
        price={product.price}
        originalPrice={cardVariant === "deal" || cardVariant === "premium" ? product.original_price : undefined}
        size={cardVariant === "deal" ? "lg" : cardVariant === "premium" ? "lg" : "md"}
        className="min-w-0 shrink"
      />
      <span className="shrink-0 text-[11px] tabular-nums text-[var(--theme-text-muted)]">
        {soldOut ? "已售罄" : productSalesLabel(salesCount)}
      </span>
    </div>
  );

  if (cardVariant === "compact") {
    return (
      <Reveal
        index={index}
        className="theme-product-card group cursor-pointer overflow-hidden theme-rounded"
        onClick={() => openDetail("categories")}
      >
        <div className="flex gap-3 p-3">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]">
            <ProgressiveImage
              src={coverSrc}
              blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
              alt={product.name}
              className="h-full w-full bg-transparent"
              imgClassName="h-full w-full [object-fit:var(--theme-image-fit,cover)]"
              sizes="(max-width: 768px) 28vw, 200px"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
            {nameRow}
            {metaRow}
          </div>
        </div>
      </Reveal>
    );
  }

  const isPremium = cardVariant === "premium";

  return (
    <Reveal
      index={index}
      className="theme-product-card group cursor-pointer overflow-hidden theme-rounded"
      onClick={() => openDetail("product_grid")}
    >
      <div
        className="relative overflow-hidden bg-[var(--theme-bg)]"
        style={{ aspectRatio: isPremium ? "1 / 1" : "var(--theme-image-ratio)" }}
      >
        <ProgressiveImage
          src={coverSrc}
          blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
          alt={product.name}
          className="h-full w-full bg-transparent"
          imgClassName="h-full w-full transition-all duration-300 ease-in-out group-hover:scale-105 [object-fit:var(--theme-image-fit,cover)]"
          sizes="(max-width: 768px) 45vw, 320px"
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.active_activity && (
            <StoreBadge type="sale">{product.active_activity.type === "flash_sale" ? "秒杀" : "满减"}</StoreBadge>
          )}
          {product.is_hot && <StoreBadge type="hot">热销</StoreBadge>}
          {product.is_new && <StoreBadge type="new">新品</StoreBadge>}
          <ProductTagList tags={product.tags} max={2} />
        </div>
        {soldOut ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-semibold text-white">
            已售罄
          </span>
        ) : null}
      </div>
      <div className={`flex flex-col gap-2 p-3 ${isPremium ? "gap-2.5 p-3.5" : ""}`}>
        {nameRow}
        {metaRow}
      </div>
    </Reveal>
  );
}
