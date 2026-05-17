import { useNavigate } from "react-router-dom";
import type { Product } from "@/types/product";
import Reveal from "@/components/Reveal";
import ProductCoverImage from "@/components/ProductCoverImage";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import ProductTagList from "@/components/ProductTagList";
import StoreBadge from "@/components/ui/StoreBadge";
import StorePrice from "@/components/ui/StorePrice";
import { productSalesLabel } from "@/utils/productSales";
import { trackEvent } from "@/services/analyticsService";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  index?: number;
}

/** 商品图上的售罄层：保留封面可见，文案清晰可读 */
function ProductSoldOutOverlay({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center p-1.5 sm:p-3">
        <span
          className={cn(
            "rounded-full border border-white/35 bg-black/65 font-bold tracking-wide text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur-sm",
            compact ? "px-2 py-0.5 text-[10px]" : "px-4 py-1.5 text-sm",
          )}
        >
          已售罄
        </span>
      </div>
    </>
  );
}

export default function ProductCard({ product, index = 0 }: Props) {
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const cardCenter = themeConfig.cardTextAlign === "center";
  const cardVariant = themeConfig.productCardVariant ?? "standard";
  const defaultVariant = product.default_variant ?? (product.variants?.length === 1 ? product.variants[0] : null);
  const displayStock = Number(defaultVariant?.stock ?? product.stock ?? 0);
  const soldOut = displayStock <= 0;
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

  const isCompact = cardVariant === "compact";
  const metaRow = (
    <div
      className={cn(
        "flex w-full gap-2",
        isCompact ? "flex-col items-start gap-1" : "items-end justify-between",
        cardCenter && !isCompact ? "justify-center" : "",
      )}
    >
      <StorePrice
        price={product.price}
        originalPrice={cardVariant === "deal" || cardVariant === "premium" ? product.original_price : undefined}
        size={isCompact ? "sm" : cardVariant === "deal" ? "lg" : cardVariant === "premium" ? "lg" : "md"}
        className="min-w-0 max-w-full"
      />
      {isCompact && soldOut ? null : (
        <span
          className={cn(
            "text-[11px] tabular-nums text-[var(--theme-text-muted)]",
            isCompact ? "leading-tight" : "shrink-0",
          )}
        >
          {soldOut ? "已售罄" : productSalesLabel(salesCount)}
        </span>
      )}
    </div>
  );

  if (isCompact) {
    return (
      <Reveal
        index={index}
        className="theme-product-card group cursor-pointer overflow-hidden theme-rounded"
        onClick={() => openDetail("categories")}
      >
        <div className="flex gap-2.5 p-2.5 sm:gap-3 sm:p-3">
          <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] sm:h-24 sm:w-24">
            <ProductCoverImage
              url={product.cover_image}
              alt={product.name}
              className="h-full w-full"
              imgClassName={cn(
                "h-full w-full [object-fit:var(--theme-image-fit,cover)]",
                soldOut && "grayscale-[35%] brightness-[0.88] saturate-[0.85]",
              )}
              sizes="(max-width: 768px) 28vw, 200px"
            />
            {soldOut ? <ProductSoldOutOverlay compact /> : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 py-0.5 sm:gap-2">
            {nameRow}
            <div className="mt-auto w-full">{metaRow}</div>
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
        <ProductCoverImage
          url={product.cover_image}
          alt={product.name}
          className="h-full w-full"
          imgClassName={cn(
            "h-full w-full [object-fit:var(--theme-image-fit,cover)] transition-all duration-300 ease-in-out",
            soldOut
              ? "grayscale-[35%] brightness-[0.88] saturate-[0.85]"
              : "group-hover:scale-105",
          )}
          sizes="(max-width: 768px) 45vw, 320px"
        />
        <div className="absolute left-2 top-2 z-[1] flex flex-wrap gap-1">
          {product.active_activity && (
            <StoreBadge type="sale">{product.active_activity.type === "flash_sale" ? "秒杀" : "满减"}</StoreBadge>
          )}
          {product.is_hot && <StoreBadge type="hot">热销</StoreBadge>}
          {product.is_new && <StoreBadge type="new">新品</StoreBadge>}
          <ProductTagList tags={product.tags} max={2} />
        </div>
        {soldOut ? <ProductSoldOutOverlay /> : null}
      </div>
      <div className={`flex flex-col gap-2 p-3 ${isPremium ? "gap-2.5 p-3.5" : ""}`}>
        {nameRow}
        {metaRow}
      </div>
    </Reveal>
  );
}
