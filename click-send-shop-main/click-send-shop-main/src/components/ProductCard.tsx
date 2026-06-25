import { memo, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { MouseEvent } from "react";
import type { Product } from "@/types/product";
import { AnimatedSection } from "@/modules/micro-interactions/components/AnimatedSection";
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
import { trackEventLazy } from "@/services/trackEventLazy";
import { cn } from "@/lib/utils";
import { isProductNewArrival } from "@/utils/productNewArrival";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import type { ThemeConfig } from "@/types/theme";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";

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
  themeConfig?: ThemeConfig;
  animate?: boolean;
  lightMedia?: boolean;
}

type ProductImpressionHandler = () => void;

const productImpressionHandlers = new WeakMap<Element, ProductImpressionHandler>();
let sharedProductImpressionObserver: IntersectionObserver | null = null;

function activityBadgeLabel(type: string | undefined) {
  if (type === "flash_sale") return "秒杀";
  if (type === "limited_time_discount") return "折扣";
  if (type === "member_price") return "会员";
  if (type === "points_reward" || type === "checkin_reward") return "积分";
  return "满减";
}

function getSharedProductImpressionObserver() {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!sharedProductImpressionObserver) {
    sharedProductImpressionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.4) return;
        const handler = productImpressionHandlers.get(entry.target);
        if (!handler) return;
        handler();
        productImpressionHandlers.delete(entry.target);
        sharedProductImpressionObserver?.unobserve(entry.target);
      });
    }, { threshold: [0.4] });
  }
  return sharedProductImpressionObserver;
}

function observeProductImpression(node: Element, onVisible: ProductImpressionHandler) {
  const observer = getSharedProductImpressionObserver();
  if (!observer) {
    onVisible();
    return () => undefined;
  }

  productImpressionHandlers.set(node, onVisible);
  observer.observe(node);
  return () => {
    productImpressionHandlers.delete(node);
    observer.unobserve(node);
  };
}

function ProductCardShell({
  animate,
  children,
  className,
  delay,
  onClick,
}: {
  animate: boolean;
  children: ReactNode;
  className: string;
  delay: number;
  onClick: () => void;
}) {
  if (!animate) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <AnimatedSection as="div" delay={delay} className={className} onClick={onClick}>
      {children}
    </AnimatedSection>
  );
}

/** 商品图上的售罄层：保留封面可见，文案清晰可读 */
function ProductSoldOutOverlay({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--overlay-color) 62%, transparent), color-mix(in srgb, var(--overlay-color) 28%, transparent), color-mix(in srgb, var(--overlay-color) 10%, transparent))",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center p-1.5 sm:p-3">
        <span
          className={cn(
            "rounded-full border border-[color-mix(in_srgb,var(--hero-foreground)_35%,transparent)] bg-[color-mix(in_srgb,var(--overlay-color)_68%,transparent)] font-bold tracking-wide text-[var(--hero-foreground)] shadow-[0_4px_16px_var(--shadow-color)] backdrop-blur-sm",
            compact ? "px-2 py-0.5 text-[10px]" : "px-4 py-1.5 text-sm",
          )}
        >
          已售罄
        </span>
      </div>
    </>
  );
}

function ProductCard(props: Props) {
  if (props.siteContext && props.themeConfig) {
    return <ProductCardInner {...props} siteContext={props.siteContext} />;
  }
  return <ProductCardWithHooks {...props} />;
}

export default memo(ProductCard);

function ProductCardWithHooks(props: Props) {
  const capabilities = useSiteCapabilities();
  const siteInfo = useSiteInfo();
  const { themeConfig } = useThemeRuntime();
  return (
    <ProductCardInner
      {...props}
      siteContext={props.siteContext ?? {
        restrictedComplianceEnabled: capabilities.restrictedProductComplianceEnabled,
        siteInfo,
      }}
      themeConfig={props.themeConfig ?? themeConfig}
    />
  );
}

function ProductCardInner({
  product,
  index = 0,
  displayMode = "theme",
  siteContext,
  themeConfig,
  animate = true,
  lightMedia = false,
}: Props & { siteContext: ProductCardSiteContext; themeConfig: ThemeConfig }) {
  const navigate = useNavigate();
  const location = useLocation();
  const impressionRef = useRef<HTMLDivElement | null>(null);
  const impressionSentRef = useRef(false);
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
  const cardImageAlt = product.cover_image_alt || (isServiceLike ? `${product.name} 服务展示图` : `${product.name} 商品图片`);
  const showNewBadge = isProductNewArrival(product);
  const primaryBadgeCount =
    (product.active_activity ? 1 : 0)
    + (product.is_hot ? 1 : 0)
    + (showNewBadge ? 1 : 0);
  const productTagBadgeMax = Math.max(0, 3 - primaryBadgeCount);
  const imageLoading = index < 2 ? "eager" : "lazy";
  const imageFetchPriority = index === 0 ? "high" : undefined;
  const revealDelay = Math.min(index, 11) * 0.035;
  const withBlurPlaceholder = !lightMedia && index <= 8;

  useEffect(() => {
    const node = impressionRef.current;
    if (!node || impressionSentRef.current) return;
    return observeProductImpression(node, () => {
      if (impressionSentRef.current) return;
      impressionSentRef.current = true;
      trackEventLazy({ event_type: "product_impression", module: "product_card", product_id: product.id }, { deferMs: 9000 });
    });
  }, [product.id]);

  const openDetail = (module: string) => {
    trackEventLazy({ event_type: "product_click", module, product_id: product.id });
    navigate(`/product/${product.id}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  };
  const openNewArrivals = (event: MouseEvent) => {
    event.stopPropagation();
    navigate(NEW_ARRIVAL_CATEGORY_PATH);
  };
  const badgeButtonClass = "m-0 inline-flex h-[22px] border-0 bg-transparent p-0 leading-none shadow-none";

  const nameRow = (
    <h3
      className={cn(
        "sf-next-product-card__title line-clamp-2 text-[13.5px] leading-snug",
        cardCenter && "text-center",
      )}
    >
      {product.name}
    </h3>
  );

  const isThemeCompact = !isListRow && cardVariant === "compact";
  const isHorizontal = isListRow || isThemeCompact;
  const formatMoney = (v: number) => v.toFixed(2).replace(/\.00$/, "");
  const minPrice = Number(product.min_price ?? product.price ?? 0);
  const maxPrice = Number(product.max_price ?? product.price ?? 0);
  const hasPriceRange = Number.isFinite(minPrice) && Number.isFinite(maxPrice) && maxPrice > minPrice;
  const priceDisplay = hasPriceRange ? `${formatMoney(minPrice)}-${formatMoney(maxPrice)}` : formatMoney(Number(product.price || minPrice || 0));
  const originalPriceNum = Number(product.max_original_price ?? product.original_price ?? 0);
  const showOriginal = Number.isFinite(originalPriceNum) && originalPriceNum > (hasPriceRange ? maxPrice : Number(product.price || 0));
  const metaRow = (
    <div className={cn("sf-next-product-card__meta w-full min-w-0", cardCenter && !isHorizontal ? "text-center" : "")}>
      {isHorizontal ? (
        <StorePriceAmount
          amount={priceDisplay}
          className="sf-next-product-card__price"
          amountClassName="sf-next-price__amount text-[15px] leading-tight sm:text-base"
          currencyClassName="sf-next-price__currency mr-0.5 text-[11px] leading-none sm:text-xs"
        />
      ) : (
        <StorePriceAmount className="sf-next-product-card__price" amount={priceDisplay} />
      )}
      <div className={cn("mt-1 flex min-w-0 items-center justify-between gap-2")}>
        {showOriginal ? (
          <span className="sf-next-product-card__caption truncate text-[var(--theme-muted)] line-through">
            RM {formatMoney(originalPriceNum)}
          </span>
        ) : <span />}
        {showSales ? (
          <span className="sf-next-product-card__caption shrink-0 tabular-nums text-[var(--theme-text-muted)]">
            {productSalesLabel(salesCount)}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (isHorizontal) {
    return (
      <ProductCardShell
        animate={animate}
        delay={revealDelay}
        className="sf-next-product-card sf-next-product-card--list group cursor-pointer overflow-hidden transform-gpu [content-visibility:auto] [contain-intrinsic-size:128px]"
        onClick={() => openDetail("categories")}
      >
        <div ref={impressionRef} className={cn("flex", isListRow ? "gap-3" : "gap-2.5 sm:gap-3")}>
          <div
            className={cn(
              "sf-next-product-card__media relative shrink-0 overflow-hidden border border-[var(--theme-border)] bg-[var(--sf-product-media-bg)]",
              isListRow ? "w-20 self-start sm:w-[5.5rem]" : "w-16 self-start sm:w-20",
            )}
            style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
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
              withBlurPlaceholder={withBlurPlaceholder}
            />
            {soldOut ? <ProductSoldOutOverlay compact /> : null}
            {ageBadgeLabel ? (
              <span className="pointer-events-none absolute left-1.5 top-1.5 z-[3] rounded-full bg-[color-mix(in_srgb,var(--overlay-color)_70%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--hero-foreground)]">
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
                      {activityBadgeLabel(product.active_activity.type)}
                    </StoreBadge>
                  ) : null}
                  {product.is_hot ? <StoreBadge type="hot">热销</StoreBadge> : null}
                  {showNewBadge ? (
                    <UnifiedButton type="button" onClick={openNewArrivals} className={cn(badgeButtonClass, "cursor-pointer")}>
                      <StoreBadge type="new">新品</StoreBadge>
                    </UnifiedButton>
                  ) : null}
                  <ProductTagList tags={product.tags} max={productTagBadgeMax} />
                </div>
              ) : null}
            </div>
            <div className="mt-auto w-full">{metaRow}</div>
          </div>
        </div>
      </ProductCardShell>
    );
  }

  const isPremium = cardVariant === "premium";

  return (
    <ProductCardShell
      animate={animate}
      delay={revealDelay}
      className="sf-next-product-card sf-next-product-card--grid group cursor-pointer overflow-hidden transform-gpu [content-visibility:auto] [contain-intrinsic-size:320px]"
      onClick={() => openDetail("product_grid")}
    >
      <div
        ref={impressionRef}
        className="sf-next-product-card__media relative overflow-hidden bg-[var(--sf-product-media-bg)]"
        style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
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
          withBlurPlaceholder={withBlurPlaceholder}
        />
        <div className="absolute left-2 top-2 z-[1] flex flex-wrap gap-1">
          {product.active_activity && (
            <StoreBadge type="sale" onMedia>
              {activityBadgeLabel(product.active_activity.type)}
            </StoreBadge>
          )}
          {product.is_hot ? <StoreBadge type="hot" onMedia>热销</StoreBadge> : null}
          {showNewBadge ? (
            <UnifiedButton type="button" onClick={openNewArrivals} className={cn(badgeButtonClass, "cursor-pointer")}>
              <StoreBadge type="new" onMedia>新品</StoreBadge>
            </UnifiedButton>
          ) : null}
          <ProductTagList tags={product.tags} max={productTagBadgeMax} />
        </div>
        {soldOut ? <ProductSoldOutOverlay /> : null}
        {ageBadgeLabel ? (
          <span className="pointer-events-none absolute right-2 top-2 z-[3] rounded-full bg-[color-mix(in_srgb,var(--overlay-color)_70%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--hero-foreground)]">
            {ageBadgeLabel}
          </span>
        ) : null}
      </div>
      <div className={`sf-next-product-card__info flex flex-col gap-2 p-3 ${isPremium ? "gap-2.5 p-3.5" : ""}`}>
        {nameRow}
        {metaRow}
      </div>
    </ProductCardShell>
  );
}
