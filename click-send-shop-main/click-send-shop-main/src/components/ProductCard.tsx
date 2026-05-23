import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";
import type { Product } from "@/types/product";
import Reveal from "@/components/Reveal";
import ProductCoverImage from "@/components/ProductCoverImage";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import type { SiteInfo } from "@/types/content";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getRestrictedProductMinimumAge } from "@/utils/ageGate";
import { isRestrictedProduct } from "@/utils/restrictedProduct";
import ProductTagList from "@/components/ProductTagList";
import StoreBadge from "@/components/ui/StoreBadge";
import { getProductSalesCount, hasProductSales, productSalesLabel } from "@/utils/productSales";
import { trackEvent } from "@/services/analyticsService";
import { cn } from "@/lib/utils";
import { isProductNewArrival } from "@/utils/productNewArrival";
import StorePriceAmount from "@/components/store/StorePriceAmount";

export type ProductCardSiteContext = {
  restrictedComplianceEnabled: boolean;
  siteInfo: SiteInfo;
};

interface Props {
  product: Product;
  index?: number;
  /** 分类页列表：左图右文单行，不受主题「紧凑横版」影响 */
  displayMode?: "theme" | "list";
  /** 列表页由 SilkProductGrid 注入，避免每张卡重复订阅站点配置 */
  siteContext?: ProductCardSiteContext;
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

export default function ProductCard(props: Props) {
  if (props.siteContext) {
    return <ProductCardInner {...props} siteContext={props.siteContext} />;
  }
  return <ProductCardWithHooks {...props} />;
}

function ProductCardWithHooks(props: Omit<Props, "siteContext">) {
  const capabilities = useSiteCapabilities();
  const siteInfo = useSiteInfo();
  return (
    <ProductCardInner
      {...props}
      siteContext={{
        restrictedComplianceEnabled: capabilities.restrictedProductComplianceEnabled,
        siteInfo,
      }}
    />
  );
}

function ProductCardInner({
  product,
  index = 0,
  displayMode = "theme",
  siteContext,
}: Props & { siteContext: ProductCardSiteContext }) {
  const navigate = useNavigate();
  const impressionRef = useRef<HTMLDivElement | null>(null);
  const impressionSentRef = useRef(false);
  const { themeConfig } = useThemeRuntime();
  const { siteInfo, restrictedComplianceEnabled } = siteContext;
  const showAgeBadge = restrictedComplianceEnabled && isRestrictedProduct(product);
  const ageBadgeLabel = showAgeBadge ? `${getRestrictedProductMinimumAge(product, siteInfo)}+` : null;
  const cardCenter = themeConfig.cardTextAlign === "center" && displayMode !== "list";
  const cardVariant = themeConfig.productCardVariant ?? "standard";
  const isListRow = displayMode === "list";
  const defaultVariant = product.default_variant ?? (product.variants?.length === 1 ? product.variants[0] : null);
  const displayStock = Number(defaultVariant?.stock ?? product.stock ?? 0);
  const soldOut = displayStock <= 0;
  const salesCount = getProductSalesCount(product.sales_count);
  const showSales = hasProductSales(product.sales_count);
  const isServiceLike = /服务|咨询|办理|申请|装修/.test(String(product.category_name || product.name || ""));
  const cardImageAlt = isServiceLike ? `${product.name} 服务展示图` : `${product.name} 商品图片`;
  const showNewBadge = isProductNewArrival(product);
  const imageLoading = index < 4 ? "eager" : "lazy";
  const imageFetchPriority = index < 2 ? "high" : undefined;

  useEffect(() => {
    const node = impressionRef.current;
    if (!node || impressionSentRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.4);
      if (!visible || impressionSentRef.current) return;
      impressionSentRef.current = true;
      void trackEvent({ event_type: "product_impression", module: "product_card", product_id: product.id });
      observer.disconnect();
    }, { threshold: [0.4] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [product.id]);

  const openDetail = (module: string) => {
    void trackEvent({ event_type: "product_click", module, product_id: product.id });
    navigate(`/product/${product.id}`);
  };
  const openNewArrivals = (event: MouseEvent) => {
    event.stopPropagation();
    navigate("/new-arrivals");
  };

  const nameRow = (
    <h3
      className={cn(
        "line-clamp-2 text-[13.5px] font-semibold leading-snug text-[var(--theme-text)]",
        cardCenter && "text-center",
      )}
    >
      {product.name}
    </h3>
  );

  const isThemeCompact = !isListRow && cardVariant === "compact";
  const isHorizontal = isListRow || isThemeCompact;
  const priceNum = Number(product.price || 0);
  const originalPriceNum = Number(product.original_price || 0);
  const showOriginal = Number.isFinite(originalPriceNum) && originalPriceNum > priceNum;
  const formatMoney = (v: number) => v.toFixed(2).replace(/\.00$/, "");
  const metaRow = (
    <div className={cn("w-full min-w-0", cardCenter && !isHorizontal ? "text-center" : "")}>
      {isHorizontal ? (
        <StorePriceAmount
          amount={formatMoney(priceNum)}
          amountClassName="text-[15px] font-extrabold leading-tight sm:text-base"
          currencyClassName="mr-0.5 text-[11px] font-bold leading-none sm:text-xs"
        />
      ) : (
        <StorePriceAmount amount={formatMoney(priceNum)} />
      )}
      <div className={cn("mt-1 flex min-w-0 items-center justify-between gap-2")}>
        {showOriginal ? (
          <span className="store-caption truncate text-[var(--theme-muted)] line-through">
            RM {formatMoney(originalPriceNum)}
          </span>
        ) : <span />}
        {showSales ? (
          <span className="store-caption shrink-0 tabular-nums text-[var(--theme-text-muted)]">
            {productSalesLabel(salesCount)}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (isHorizontal) {
    return (
      <Reveal
        index={index}
        className="theme-product-card group cursor-pointer overflow-hidden theme-rounded transform-gpu"
        onClick={() => openDetail("categories")}
      >
        <div ref={impressionRef} className={cn("flex", isListRow ? "gap-3 p-3" : "gap-2.5 p-2.5 sm:gap-3 sm:p-3")}>
          <div
            className={cn(
              "theme-rounded relative shrink-0 overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-bg)]",
              isListRow ? "h-28 w-28 sm:h-[7.25rem] sm:w-[7.25rem]" : "h-[5.25rem] w-[5.25rem] sm:h-24 sm:w-24",
            )}
          >
            <ProductCoverImage
              url={product.cover_image}
              alt={cardImageAlt}
              className="h-full w-full"
              imgClassName={cn(
                "h-full w-full [object-fit:var(--theme-image-fit,cover)] transition-transform duration-300 ease-out group-hover:scale-[1.018]",
                soldOut && "grayscale-[35%] brightness-[0.88] saturate-[0.85]",
              )}
              sizes={isListRow ? "(max-width: 768px) 112px, 160px" : "(max-width: 768px) 28vw, 200px"}
              loading={imageLoading}
              fetchPriority={imageFetchPriority}
            />
            {soldOut ? <ProductSoldOutOverlay compact /> : null}
            {ageBadgeLabel ? (
              <span className="pointer-events-none absolute left-1.5 top-1.5 z-[3] rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {ageBadgeLabel}
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
            <div className="space-y-1.5">
              {nameRow}
              {isListRow &&
              (product.active_activity || product.is_hot || showNewBadge || (product.tags?.length ?? 0) > 0) ? (
                <div className="flex flex-wrap gap-1">
                  {product.active_activity ? (
                    <StoreBadge type="sale">
                      {product.active_activity.type === "flash_sale" ? "秒杀" : "满减"}
                    </StoreBadge>
                  ) : null}
                  {product.is_hot ? <StoreBadge type="hot">热销</StoreBadge> : null}
                  {showNewBadge ? (
                    <button type="button" onClick={openNewArrivals} className="cursor-pointer">
                      <StoreBadge type="new">新品</StoreBadge>
                    </button>
                  ) : null}
                  <ProductTagList tags={product.tags} max={2} />
                </div>
              ) : null}
            </div>
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
      className="theme-product-card group cursor-pointer overflow-hidden theme-rounded transform-gpu"
      onClick={() => openDetail("product_grid")}
    >
      <div
        ref={impressionRef}
        className="theme-rounded relative overflow-hidden bg-[var(--theme-bg)]"
        style={{ aspectRatio: isPremium ? "1 / 1" : "var(--theme-image-ratio)" }}
      >
        <ProductCoverImage
          url={product.cover_image}
          alt={cardImageAlt}
          className="h-full w-full"
          imgClassName={cn(
            "h-full w-full [object-fit:var(--theme-image-fit,cover)] transition-all duration-300 ease-in-out",
            soldOut
              ? "grayscale-[35%] brightness-[0.88] saturate-[0.85]"
              : "group-hover:scale-[1.025]",
          )}
          sizes="(max-width: 768px) 45vw, 320px"
          loading={imageLoading}
          fetchPriority={imageFetchPriority}
        />
        <div className="absolute left-2 top-2 z-[1] flex flex-wrap gap-1">
          {product.active_activity && (
            <StoreBadge type="sale">{product.active_activity.type === "flash_sale" ? "秒杀" : "满减"}</StoreBadge>
          )}
          {product.is_hot && <StoreBadge type="hot">热销</StoreBadge>}
          {showNewBadge ? (
            <button type="button" onClick={openNewArrivals} className="cursor-pointer">
              <StoreBadge type="new">新品</StoreBadge>
            </button>
          ) : null}
          <ProductTagList tags={product.tags} max={2} />
        </div>
        {soldOut ? <ProductSoldOutOverlay /> : null}
        {ageBadgeLabel ? (
          <span className="pointer-events-none absolute right-2 top-2 z-[3] rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {ageBadgeLabel}
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
