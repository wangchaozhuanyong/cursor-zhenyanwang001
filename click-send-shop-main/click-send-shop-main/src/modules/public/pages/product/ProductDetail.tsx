import { useState, useEffect, useRef } from "react";
import { ArrowLeft, BadgePercent, CheckCircle2, Headphones, PackageCheck, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useCartStore } from "@/stores/useCartStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import ProductCardV2 from "@/modules/storefront-v2/product/ProductCardV2";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import ProductReviews from "@/components/ProductReviews";
import { useProductReviews } from "@/hooks/useProductReviews";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductDetailStickyHeader from "@/components/product/ProductDetailStickyHeader";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { STORE_DETAIL_STICKY_TOP_CLASS } from "@/constants/storeLayout";
import { STORE_COPY } from "@/constants/storeCopy";
import { useProductDetailHeaderSolid } from "@/hooks/useProductDetailHeaderSolid";
import ProductTagList from "@/components/ProductTagList";
import { AppModal, FavoriteMotionButton } from "@/modules/micro-interactions";
import ProductVariantSheet from "@/components/product/ProductVariantSheet";
import TrustInfo from "@/components/TrustInfo";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGoBack } from "@/hooks/useGoBack";
import { copyToClipboard } from "@/utils/clipboard";
import { trackAddToCart, trackProductView } from "@/utils/tracking";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useProductPurchaseCouponChoice } from "@/hooks/useProductPurchaseCouponChoice";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useClientDesignStyle } from "@/modules/storefront-v2/design/useClientDesignStyle";
import { getProductGridClassName } from "@/utils/productGridClasses";
import { THEME_BTN_ACCENT_SOLID } from "@/utils/themeVisuals";
import { trackEvent } from "@/services/analyticsService";
import { buildProductSharePayload } from "@/utils/productShare";
import { getProductSalesCount, hasProductSales, productSalesDetailLabel } from "@/utils/productSales";
import { buildSupportPageUrl, openCustomerService } from "@/utils/customerService";
import { cn } from "@/lib/utils";
import SeoHead from "@/components/SeoHead";
import { buildCanonical, stripHtml, truncateText } from "@/utils/seo";
import { buildProductJsonLd } from "@/utils/structuredData";
import RegulatedProductNotice from "@/components/compliance/RegulatedProductNotice";
import RestrictedAgeConfirmModal from "@/components/compliance/RestrictedAgeConfirmModal";
import {
  getRestrictedProductMinimumAge,
  requiresRestrictedPurchaseConfirmation,
} from "@/utils/ageGate";
import {
  buildRegulatedProductNoticeProps,
  canIndexProductDetail,
  shouldShowRegulatedNotice,
} from "@/utils/regulatedProductNotice";
import { isRestrictedProduct } from "@/utils/restrictedProduct";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { DesktopPurchaseActionCard } from "@/components/store/DesktopPurchasePattern";
import ProductActivityPanel from "@/modules/storefront-v2/product-detail/ProductActivityPanel";
import { buildProductDisplayPriceModel } from "@/modules/storefront-v2/product/productDisplayPricing";
import { usePublicLocale } from "@/i18n/publicLocale";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const goBack = useGoBack(localizedPath("/"));
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [variantSheetOpen, setVariantSheetOpen] = useState(false);
  const [purchaseIntent, setPurchaseIntent] = useState<"cart" | "buy">("cart");
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [purchaseAgeOk, setPurchaseAgeOk] = useState(true);
  const [ageConfirmOpen, setAgeConfirmOpen] = useState(false);
  const [pendingPurchaseIntent, setPendingPurchaseIntent] = useState<"cart" | "buy" | null>(null);
  const trackedProductIdRef = useRef<string | null>(null);
  const headerSentinelRef = useRef<HTMLDivElement>(null);

  const product = useProductStore((s) => s.currentProduct);
  const relatedProducts = useProductStore((s) => s.relatedProducts);
  const relatedProductsLoading = useProductStore((s) => s.relatedProductsLoading);
  const loading = useProductStore((s) => s.detailLoading);
  const error = useProductStore((s) => s.error);
  const loadProductDetail = useProductStore((s) => s.loadProductDetail);

  const headerSolid = useProductDetailHeaderSolid(headerSentinelRef, {
    observe: Boolean(product) && !loading,
    defaultSolid: !loading && !product,
  });

  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const isFavorite = useFavoritesStore((s) => (id ? s.isFavorite(id) : false));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const reviewsVm = useProductReviews(id ?? "");
  const siteInfo = useSiteInfo();
  const siteCapabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const clientStyle = useClientDesignStyle();
  const productGridClass = getProductGridClassName(themeConfig.productCardVariant);
  const pageBgClass = cn(
    clientStyle === "black_gold"
      ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))_0%,var(--theme-bg)_24rem,var(--theme-bg)_100%)]"
      : clientStyle === "deep_enterprise"
        ? "bg-[linear-gradient(180deg,#101B34_0%,#101B34_7rem,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))_7rem,var(--theme-bg)_24rem,var(--theme-bg)_100%)]"
        : "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))_0%,var(--theme-bg)_24rem,color-mix(in_srgb,var(--theme-primary)_3%,var(--theme-bg))_100%)]",
  );
  const purchaseAvailableVariants = product
    ? (product.variants ?? []).filter((v) => v.id && v.enabled !== false)
    : [];
  const purchaseSelectedVariant = product && purchaseAvailableVariants.length
    ? selectedVariantId
      ? purchaseAvailableVariants.find((v) => v.id === selectedVariantId) ?? null
      : purchaseAvailableVariants.length === 1
        ? purchaseAvailableVariants[0]
        : null
    : null;
  const purchaseDefaultVariant = product
    ? product.default_variant ?? purchaseAvailableVariants.find((v) => v.is_default) ?? purchaseAvailableVariants[0] ?? null
    : null;
  const purchaseCoupon = useProductPurchaseCouponChoice({
    enabled: Boolean(product && variantSheetOpen && purchaseIntent === "buy" && siteCapabilities.couponEnabled),
    product,
    variant: purchaseSelectedVariant ?? purchaseDefaultVariant,
    qty,
  });

  useDocumentTitle(product?.name);

  useEffect(() => {
    if (!product) return;
    const syncPurchaseAge = () => {
      setPurchaseAgeOk(!requiresRestrictedPurchaseConfirmation(product, siteInfo));
    };
    syncPurchaseAge();
    window.addEventListener("age-gate:confirmed", syncPurchaseAge);
    return () => window.removeEventListener("age-gate:confirmed", syncPurchaseAge);
  }, [product, siteInfo]);

  useEffect(() => {
    if (id) {
      loadProductDetail(id);
      setQty(1);
      setSelectedVariantId("");
    }
  }, [id, loadProductDetail]);

  useEffect(() => {
    if (product) addToHistory(product);
  }, [product, addToHistory]);

  useEffect(() => {
    if (!product || trackedProductIdRef.current === product.id) return;
    trackedProductIdRef.current = product.id;
    trackProductView(product);
    void trackEvent({ event_type: "product_view", module: "product_detail", product_id: product.id });
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const active = product.active_activity;
    const variants = (product.variants ?? []).filter((v) => v.id);
    const defaultVariant = variants.find((v) => v.is_default) ?? variants[0] ?? product.default_variant ?? null;
    const baseStock = variants.length === 1 ? Number(defaultVariant?.stock || 0) : Number(product.stock || 0);
    const remaining = active ? Math.max(0, active.remaining_stock ?? 0) : baseStock;
    const limit = active?.limit_per_user && active.limit_per_user > 0 ? active.limit_per_user : baseStock;
    const max = Math.max(0, Math.min(baseStock, remaining, limit));
    setQty((prev) => (max <= 0 ? 0 : Math.max(1, Math.min(prev, max))));
  }, [product]);

  if (loading) {
    return (
      <div className={cn("store-bottom-action-space min-h-screen md:pb-0", pageBgClass)} data-storefront-client-style={clientStyle}>
        <ProductDetailStickyHeader
          solid={false}
          onBack={goBack}
          onShare={() => {}}
          onCart={() => navigate(localizedPath("/cart"))}
        />
        <div className="relative">
          <Skeleton className="w-full" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE} />
        </div>
        <div className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] pt-[var(--store-page-y)] md:px-6 md:py-10">
          <div className="space-y-3 md:max-w-xl">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={cn("min-h-screen", pageBgClass)} data-storefront-client-style={clientStyle}>
        <ProductDetailStickyHeader
          solid
          onBack={goBack}
          onShare={() => {}}
          onCart={() => navigate(localizedPath("/cart"))}
        />
        <div
          className="mx-auto w-full max-w-screen-sm px-[var(--store-page-x)]"
          style={{
            paddingTop: "calc(var(--store-tab-header-height, 3.5rem) + env(safe-area-inset-top, 0px) + 2rem)",
          }}
        >
          <ProductDetailErrorPanel
            title={error ? "商品加载失败" : "商品不存在"}
            description={error ?? "该商品可能已下架，或当前链接不可用。"}
            onRetry={() => id && loadProductDetail(id)}
            onBrowse={() => navigate(localizedPath("/categories"))}
            onPromotions={() => navigate(localizedPath("/promotions"))}
          />
        </div>
      </div>
    );
  }

  const activeActivity = product.active_activity;
  const availableVariants = purchaseAvailableVariants;
  const selectedVariant = purchaseSelectedVariant;
  const hasMultipleVariants = availableVariants.length > 1;
  const defaultVariant = purchaseDefaultVariant;
  const displayPriceModel = buildProductDisplayPriceModel(product, selectedVariant);
  const displayPrice = displayPriceModel.displayPrice;
  const displayPriceForCompare = displayPriceModel.comparePrice;
  const displayPriceAmount = displayPriceModel.amount;
  const displayOriginalPrice = displayPriceModel.originalPrice;
  const displayStock = selectedVariant?.stock ?? (hasMultipleVariants ? product.stock : defaultVariant?.stock ?? product.stock);
  const activityRemaining = activeActivity ? Math.max(0, activeActivity.remaining_stock ?? 0) : displayStock;
  const activityLimit = activeActivity?.limit_per_user && activeActivity.limit_per_user > 0
    ? activeActivity.limit_per_user
    : displayStock;
  const maxQty = Math.max(0, Math.min(displayStock, activityRemaining, activityLimit));
  const soldOut = maxQty <= 0;
  const salesCount = hasProductSales(product.sales_count) ? getProductSalesCount(product.sales_count) : null;
  const statusBadges: { key: string; label: string; className: string }[] = [];
  if (product.is_hot) {
    statusBadges.push({
      key: "hot",
      label: "热销",
      className: "theme-rounded bg-[var(--theme-price)] px-2 py-0.5 text-[10px] font-bold leading-none text-[var(--theme-price-foreground)]",
    });
  }
  if (product.is_new) {
    statusBadges.push({
      key: "new",
      label: "新品",
      className:
        "theme-rounded bg-[var(--theme-primary)] px-2 py-0.5 text-[10px] font-bold leading-none text-[var(--theme-primary-foreground)]",
    });
  }
  const showPriceMeta = salesCount !== null || statusBadges.length > 0;
  const detailSections = buildDetailSections(product.description);
  const detailSummaryItems = [
    {
      label: "详情条目",
      value: `${detailSections.length} 条`,
      desc: detailSections.length > 1 ? "已拆分为可扫描的商品说明" : "下单前建议确认商品说明",
      icon: CheckCircle2,
    },
    {
      label: "规格库存",
      value: hasMultipleVariants ? `${availableVariants.length} 个规格` : "默认规格",
      desc: soldOut ? "当前不可购买" : "库存会在结算前确认",
      icon: PackageCheck,
    },
    {
      label: "活动规则",
      value: activeActivity ? "已命中" : "普通价格",
      desc: activeActivity ? "活动价、限购、互斥以结算页为准" : "暂无活动优惠",
      icon: BadgePercent,
    },
    {
      label: "配送售后",
      value: "订单确认",
      desc: "地址、运费和售后资格跟随订单状态",
      icon: Truck,
    },
  ];
  const restricted = isRestrictedProduct(product);
  const showRegulatedNotice = shouldShowRegulatedNotice(
    product,
    siteCapabilities.restrictedProductComplianceEnabled,
  );
  const regulatedNoticeProps = buildRegulatedProductNoticeProps(product, siteInfo);
  const canIndex = canIndexProductDetail(product, siteInfo);
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const canonical = buildCanonical(`/product/${product.id}`);
  const productDescRaw = stripHtml(product.description || "");
  const productDescription = truncateText(
    restricted
      ? "本页面包含受年龄、地区或当地法规限制的商品或服务信息，仅面向符合法定年龄并符合当地规定的用户展示。具体适用范围以当地法律法规、平台规则和客服确认为准。"
      : productDescRaw || `查看 ${product.name} 的详情、价格、库存状态与客服咨询说明。具体购买或办理信息以下单页面和客服确认为准。`,
    150,
  );
  const seoImage = selectedVariant?.image_url || product.cover_image || product.images?.[0] || siteInfo.ogImageUrl || "/og-default.png";
  const productJsonLd = canIndex ? buildProductJsonLd(product) : null;
  const galleryImages = Array.from(new Set([...(selectedVariant?.image_url ? [selectedVariant.image_url] : []), ...(Array.isArray(product.images) && product.images.length ? product.images : []), ...(product.cover_image ? [product.cover_image] : [])].filter((url): url is string => typeof url === "string" && url.trim().length > 0)));
  const galleryImageAlts = galleryImages.map((url, index) => {
    if (selectedVariant?.image_url && url === selectedVariant.image_url) {
      return `${product.name} ${selectedVariant.title || selectedVariant.sku_code || "规格图"}`;
    }
    if (product.cover_image && url === product.cover_image) {
      return product.cover_image_alt || `${product.name} 主图`;
    }
    const imageIndex = Array.isArray(product.images) ? product.images.findIndex((img) => img === url) : -1;
    if (imageIndex >= 0) {
      return product.image_alts?.[imageIndex] || `${product.name} 详情图 ${imageIndex + 1}`;
    }
    return `${product.name} 商品图 ${index + 1}`;
  });

  const ensureVariantSelected = () => {
    if (availableVariants.length === 1 && !selectedVariantId) {
      setSelectedVariantId(availableVariants[0].id);
      return availableVariants[0];
    }
    return selectedVariant;
  };

  const purchaseAgeBlocked = Boolean(product && !purchaseAgeOk);
  const purchaseMinimumAge = product ? getRestrictedProductMinimumAge(product, siteInfo) : 18;

  const openPurchaseSheetCore = (intent: "cart" | "buy") => {
    if (soldOut) {
      toast.error("库存不足");
      return;
    }
    if (availableVariants.length === 1) setSelectedVariantId(availableVariants[0].id);
    setPurchaseIntent(intent);
    setVariantSheetOpen(true);
  };

  const openPurchaseSheet = (intent: "cart" | "buy") => {
    if (purchaseAgeBlocked) {
      setPendingPurchaseIntent(intent);
      setAgeConfirmOpen(true);
      return;
    }
    openPurchaseSheetCore(intent);
  };

  const handleAgeConfirmed = () => {
    setPurchaseAgeOk(true);
    setAgeConfirmOpen(false);
    const intent = pendingPurchaseIntent;
    setPendingPurchaseIntent(null);
    if (intent) openPurchaseSheetCore(intent);
  };

  const buildPurchaseSnapshot = (variant: typeof defaultVariant) => {
    const productSnapshot = variant
      ? { ...product, price: displayPriceAmount, stock: variant.stock }
      : { ...product, price: displayPriceAmount };
    const variantSnapshot = variant ? { ...variant, price: displayPriceAmount } : null;

    return { productSnapshot, variantSnapshot };
  };

  const commitAddToCart = async () => {
    const variant = ensureVariantSelected() ?? defaultVariant;
    if (availableVariants.length > 1 && !variant) {
      toast.error("请选择商品规格");
      return;
    }
    const { productSnapshot, variantSnapshot } = buildPurchaseSnapshot(variant);
    try {
      await addItem(
        productSnapshot,
        qty,
        variantSnapshot,
      );
      trackAddToCart(productSnapshot, qty);
      void trackEvent({
        event_type: "add_to_cart",
        module: "product_detail",
        product_id: product.id,
        variant_id: selectedVariant?.id ?? defaultVariant?.id,
        quantity: qty,
        amount: displayPriceAmount * Number(qty || 0),
      });
      window.dispatchEvent(new CustomEvent("cart:badge-bump"));
      toast.success("已加入购物车", toastPresetQuickSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加入购物车失败");
    }
  };

  const handleAddToCart = () => openPurchaseSheet("cart");

  const commitBuyNow = () => {
    const variant = ensureVariantSelected() ?? defaultVariant;
    if (availableVariants.length > 1 && !variant) {
      toast.error("请选择商品规格");
      return;
    }
    const { productSnapshot, variantSnapshot } = buildPurchaseSnapshot(variant);
    useCartStore.getState().setBuyNow(productSnapshot, qty, variantSnapshot, purchaseCoupon.checkoutChoice);
    void trackEvent({
      event_type: "checkout_start",
      module: "product_detail",
      product_id: product.id,
      variant_id: selectedVariant?.id ?? defaultVariant?.id,
      quantity: qty,
      amount: displayPriceAmount * Number(qty || 0),
    });
    navigate(localizedPath("/checkout"));
  };

  const handleBuyNow = () => openPurchaseSheet("buy");

  const handleFavorite = async () => {
    try {
      const favorited = await toggleFavorite(product);
      void trackEvent({ event_type: "favorite", module: "product_detail", product_id: product.id, quantity: favorited ? 1 : 0 });
      toast.success(favorited ? "已收藏" : "已取消收藏", toastPresetQuickSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "收藏操作失败");
    }
  };

  const handleCustomerService = async () => {
    const result = openCustomerService(siteInfo);
    if (result.action === "wechat_copy" && result.wechatId) {
      const copied = await copyToClipboard(result.wechatId);
      if (copied) toast.success("客服微信号已复制", toastPresetQuickSuccess);
      else toast.error("复制失败，请手动复制微信号");
      return;
    }
    if (result.action === "support_page") {
      navigate(buildSupportPageUrl(result.channelId));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const sharePayload = buildProductSharePayload(
      product.name,
      displayPriceAmount,
      url,
      siteInfo.siteName,
    );
    void trackEvent({ event_type: "activity_click", module: "product_detail", product_id: product.id });

    if (navigator.share) {
      try {
        await navigator.share({
          title: sharePayload.title,
          text: sharePayload.text,
          url: sharePayload.url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    setShareText(sharePayload.text);
    setShareSheetOpen(true);
  };

  return (
    <div className={cn("store-conversion-page store-v12-page store-product-detail-page store-bottom-action-space min-h-screen text-[var(--theme-text)] md:pb-0 lg:pb-0", pageBgClass)} data-storefront-client-style={clientStyle}>
      <SeoHead
        title={`${product.name}｜${siteName}`}
        description={productDescription}
        canonical={canonical}
        robots={canIndex ? "index,follow" : "noindex,follow"}
        ogTitle={`${product.name}｜${siteName}`}
        ogDescription={productDescription}
        ogImage={seoImage}
        ogType="product"
        ogSiteName={siteName}
        jsonLd={productJsonLd ? [{ id: "product", data: productJsonLd }] : []}
      />
      <ProductDetailStickyHeader
        solid={headerSolid}
        onBack={goBack}
        onShare={handleShare}
        onCart={() => navigate(localizedPath("/cart"))}
      />
      <main className="mx-auto w-full max-w-screen-xl px-0 md:px-6 lg:px-8">
        <UnifiedButton
          type="button"
          onClick={goBack}
          className="mb-4 hidden items-center gap-1.5 px-[var(--store-page-x)] text-sm font-medium text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] lg:inline-flex lg:px-0"
        >
          <ArrowLeft size={16} />
          返回
        </UnifiedButton>
        <div className="store-detail-layout md:grid md:grid-cols-2 md:gap-10 md:items-start md:py-6 lg:gap-12 lg:py-8">
          <div className={cn("md:sticky md:self-start", STORE_DETAIL_STICKY_TOP_CLASS)}>
            <div className="store-detail-gallery relative overflow-hidden md:theme-rounded md:border md:border-[var(--theme-border)]">
              <ProductImageGallery
                images={galleryImages}
                imageAlts={galleryImageAlts}
                name={product.name}
                videoUrl={product.video_url}
              />
            </div>
          </div>

          {/* 右：商品信息 + 操作 */}
          <div>
            <div className={cn("md:sticky md:self-start", STORE_DETAIL_STICKY_TOP_CLASS)}>
              <div
                ref={headerSentinelRef}
                className="pointer-events-none h-px w-full shrink-0"
                aria-hidden
              />
              <div
                className="store-detail-info-card px-[var(--store-page-x)] pt-5 md:px-0 md:pt-0"
                style={
                  headerSolid
                    ? { scrollMarginTop: "calc(var(--store-tab-header-height, 3.5rem) + env(safe-area-inset-top, 0px))" }
                    : undefined
                }
              >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <StorePriceAmount
                      amount={displayPrice}
                      amountClassName="store-price-detail"
                      currencyClassName="mr-1 text-[13px] font-bold leading-none sm:text-sm"
                    />
                    {typeof displayOriginalPrice === "number" &&
                      displayOriginalPrice > Number(displayPriceForCompare) && (
                        <span className="store-body-small text-muted-foreground line-through">
                          RM {displayOriginalPrice}
                        </span>
                      )}
                  </div>
                </div>
                {showPriceMeta ? (
                  <div className="flex shrink-0 flex-nowrap items-center justify-end gap-x-2">
                    {statusBadges.map((badge) => (
                      <span key={badge.key} className={`inline-flex shrink-0 whitespace-nowrap ${badge.className}`}>
                        {badge.label}
                      </span>
                    ))}
                    {salesCount !== null ? (
                      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums leading-none text-[var(--theme-text-muted)]">
                        {productSalesDetailLabel(salesCount)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <h1 className="mt-3 font-display text-lg font-semibold leading-snug text-foreground md:text-[22px] md:leading-tight">
                {product.name}
              </h1>
              <ProductActivityPanel activity={activeActivity} />
              {showRegulatedNotice ? <RegulatedProductNotice {...regulatedNoticeProps} /> : null}
              {purchaseAgeBlocked ? (
                <p className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--theme-warning)_34%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-warning)_14%,var(--theme-surface))] px-3 py-2 text-xs text-[color-mix(in_srgb,var(--theme-warning)_78%,var(--theme-text-on-surface))]">
                  该商品需年满 {purchaseMinimumAge} 岁方可购买，请点击下方「需年龄确认」完成验证。
                </p>
              ) : null}
              <ProductTagList tags={product.tags} max={6} size="md" className="mt-3" />
              </div>
              <DesktopPurchaseActionCard className="mt-4">
                <DetailPurchaseBar
                  soldOut={soldOut}
                  purchaseBlocked={purchaseAgeBlocked}
                  isFavorite={isFavorite}
                  onFavorite={handleFavorite}
                  onCustomerService={() => void handleCustomerService()}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                />
              </DesktopPurchaseActionCard>
            </div>

            {/* TrustInfo - 信任三件套（详情页使用 card 强转化样式） */}
            <div className="store-trust-card mt-6 px-[var(--store-page-x)] md:px-0">
              <TrustInfo variant="card" />
            </div>

            <ProductDetailContentPanel
              sections={detailSections}
              summaryItems={detailSummaryItems}
            />
          </div>
        </div>

        {/* 评论 */}
        <ProductReviews vm={reviewsVm} />

        {/* 推荐商品 */}
        {(relatedProductsLoading || relatedProducts.length > 0) && (
          <section className="store-product-v12-related" aria-label="推荐商品">
            <div className="store-product-v12-related__head">
              <span>
                <PackageCheck size={15} aria-hidden />
                推荐商品
              </span>
            </div>
            {relatedProductsLoading ? (
              <div className={`${productGridClass} md:gap-5`}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--theme-border)_84%,transparent)] bg-[var(--theme-surface)] p-1.5 shadow-sm">
                    <Skeleton className="w-full rounded-[0.95rem]" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE} />
                    <div className="space-y-2 px-1.5 pb-2 pt-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${productGridClass} md:gap-5`}>
                {relatedProducts.map((p, i) => (
                  <ProductCardV2 key={p.id} product={p} index={i} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      {/* 底部固定操作栏 - 仅移动端 */}
      <div className="store-mobile-submit-bar fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
        <div className="mx-auto w-full px-[var(--store-page-x)] py-3 sm:max-w-lg sm:px-4">
          <DetailPurchaseBar
            soldOut={soldOut}
            purchaseBlocked={purchaseAgeBlocked}
            isFavorite={isFavorite}
            onFavorite={handleFavorite}
            onCustomerService={() => void handleCustomerService()}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />
        </div>
      </div>

      <ProductVariantSheet
        open={variantSheetOpen}
        onClose={() => setVariantSheetOpen(false)}
        product={product}
        variants={availableVariants}
        selectedVariantId={selectedVariantId || availableVariants[0]?.id || ""}
        onSelectVariant={setSelectedVariantId}
        qty={qty}
        onQtyChange={setQty}
        maxQty={maxQty}
        soldOut={soldOut}
        intent={purchaseIntent}
        purchaseCoupon={{
          enabled: purchaseCoupon.enabled,
          selectedCoupon: purchaseCoupon.selectedCoupon,
          coupons: purchaseCoupon.coupons,
          unusableCoupons: purchaseCoupon.unusableCoupons,
          loading: purchaseCoupon.loading,
          discountAmount: purchaseCoupon.couponDiscount,
          onSelect: purchaseCoupon.selectCoupon,
        }}
        onConfirm={() => {
          setVariantSheetOpen(false);
          if (purchaseIntent === "cart") void commitAddToCart();
          else commitBuyNow();
        }}
      />

      <RestrictedAgeConfirmModal
        open={ageConfirmOpen}
        requiredAge={purchaseMinimumAge}
        onClose={() => {
          setAgeConfirmOpen(false);
          setPendingPurchaseIntent(null);
        }}
        onConfirmed={handleAgeConfirmed}
      />

      <AppModal
        tier="light"
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        title="分享商品"
        height="auto"
        stickyFooter
        showHandle={false}
        footer={
          <UnifiedButton
            type="button"
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--theme-primary)] text-sm font-semibold text-[var(--theme-primary-foreground)]"
            onClick={async () => {
              const ok = await copyToClipboard(shareText);
              if (ok) {
                toast.success("已复制分享文案", toastPresetQuickSuccess);
                setShareSheetOpen(false);
              } else toast.error("复制失败");
            }}
          >
            复制分享文案
          </UnifiedButton>
        }
      >
        <p className="whitespace-pre-wrap text-sm text-[var(--theme-text-muted)]">{shareText}</p>
      </AppModal>
    </div>
  );
}

function ProductDetailContentPanel({
  sections,
  summaryItems,
}: {
  sections: string[];
  summaryItems: Array<{
    label: string;
    value: string;
    desc: string;
    icon: LucideIcon;
  }>;
}) {
  return (
    <section className="store-product-v12-content-panel" aria-labelledby="product-detail-content-heading">
      <div className="store-product-v12-content-panel__head">
        <span>
          <ShieldCheck size={15} aria-hidden />
          商品详情
        </span>
        <h2 id="product-detail-content-heading">下单前确认这些信息</h2>
        <p>详情、规格库存、活动和配送售后都在这里查看，下单前请确认清楚。</p>
      </div>
      <div className="store-product-v12-content-panel__summary">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              <span aria-hidden>
                <Icon size={16} />
              </span>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <p>{item.desc}</p>
            </div>
          );
        })}
      </div>
      <div className="store-product-v12-content-panel__list">
        {sections.map((section, idx) => (
          <article key={`${section.slice(0, 16)}-${idx}`}>
            <span aria-hidden>{String(idx + 1).padStart(2, "0")}</span>
            <p>{section}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** 详情页购买操作条：左收藏/客服，右加入购物车 + 立即购买（淘宝式双按钮） */
function DetailPurchaseBar({
  soldOut,
  purchaseBlocked = false,
  isFavorite,
  onFavorite,
  onCustomerService,
  onAddToCart,
  onBuyNow,
}: {
  soldOut: boolean;
  purchaseBlocked?: boolean;
  isFavorite: boolean;
  onFavorite: () => void;
  onCustomerService: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
}) {
  const disabled = soldOut;
  return (
    <div className="store-detail-purchase-bar flex items-stretch gap-3">
      <div className="flex shrink-0 items-center gap-4 pr-1">
        <div className="flex min-w-[2.75rem] flex-col items-center gap-0.5 text-[var(--theme-text-muted)]">
          <FavoriteMotionButton
            active={isFavorite}
            onClick={onFavorite}
            className="store-detail-mini-action-icon !h-9 !w-9"
            size={18}
          />
          <span className="text-[10px]">{isFavorite ? "已收藏" : "收藏"}</span>
        </div>
        <UnifiedButton
          type="button"
          onClick={onCustomerService}
          className="flex min-w-[2.75rem] flex-col items-center gap-0.5 text-[var(--theme-text-muted)]"
          aria-label="联系客服"
        >
          <span className="store-detail-mini-action-icon flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]">
            <Headphones size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="text-[10px]">客服</span>
        </UnifiedButton>
      </div>
      <div className="w-px shrink-0 self-stretch bg-[var(--theme-border)]" aria-hidden />
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-full shadow-sm">
        <UnifiedButton
          type="button"
          disabled={disabled}
          onClick={onAddToCart}
          className={cn(
            "min-h-11 flex-1 px-2 text-sm font-semibold transition-opacity",
            THEME_BTN_ACCENT_SOLID,
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          加入购物车
        </UnifiedButton>
        <UnifiedButton
          type="button"
          disabled={disabled}
          onClick={onBuyNow}
          className={cn(
            "min-h-11 flex-1 px-2 text-sm font-semibold transition-opacity",
            "bg-[var(--theme-price)] text-[var(--theme-price-foreground)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {soldOut ? "已售罄" : purchaseBlocked ? "确认年龄并购买" : "立即购买"}
        </UnifiedButton>
      </div>
    </div>
  );
}

function buildDetailSections(description: string): string[] {
  const raw = (description || "").trim();
  if (!raw) return ["商品或服务详情正在完善。下单前建议先联系客服确认内容、规格、配送、售后或服务边界。"];
  const parts = raw
    .split(/\n+|[；;。]/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [raw];
}

function ProductDetailErrorPanel({
  title,
  description,
  onRetry,
  onBrowse,
  onPromotions,
}: {
  title: string;
  description: string;
  onRetry: () => void;
  onBrowse: () => void;
  onPromotions: () => void;
}) {
  const guards = [
    {
      icon: PackageCheck,
      title: "商品状态",
      value: "自动更新",
      desc: "商品上下架、规格和库存会及时更新",
    },
    {
      icon: BadgePercent,
      title: "活动资格",
      value: "加载后展示",
      desc: "活动价、限购和叠加规则加载成功后展示",
    },
    {
      icon: ShieldCheck,
      title: "交易安全",
      value: "结算复核",
      desc: "价格、优惠、库存在结算页确认",
    },
  ];

  return (
    <section className="store-product-v12-error-panel" aria-labelledby="product-detail-error-heading">
      <div className="store-product-v12-error-panel__badge">
        <ShieldCheck size={15} aria-hidden />
        商品详情
      </div>
      <div className="store-product-v12-error-panel__copy">
        <h1 id="product-detail-error-heading">{title}</h1>
        <p>{description}</p>
      </div>
      <div className="store-product-v12-error-panel__guards">
        {guards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title}>
              <span aria-hidden>
                <Icon size={15} />
              </span>
              <strong>{item.value}</strong>
              <small>{item.title}</small>
              <em>{item.desc}</em>
            </div>
          );
        })}
      </div>
      <div className="store-product-v12-error-panel__actions">
        <UnifiedButton type="button" onClick={onRetry}>
          重试
        </UnifiedButton>
        <UnifiedButton type="button" onClick={onBrowse}>
          去分类
        </UnifiedButton>
        <UnifiedButton type="button" onClick={onPromotions}>
          活动中心
        </UnifiedButton>
      </div>
    </section>
  );
}
