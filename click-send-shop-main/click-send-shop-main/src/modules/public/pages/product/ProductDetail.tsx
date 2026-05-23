import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Headphones } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useCartStore } from "@/stores/useCartStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import ProductCard from "@/components/ProductCard";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import ProductReviews from "@/components/ProductReviews";
import { useProductReviews } from "@/hooks/useProductReviews";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductDetailStickyHeader from "@/components/product/ProductDetailStickyHeader";
import { STORE_DETAIL_STICKY_TOP_CLASS } from "@/constants/storeLayout";
import { useProductDetailHeaderSolid } from "@/hooks/useProductDetailHeaderSolid";
import ProductTagList from "@/components/ProductTagList";
import { BottomSheet, FavoriteMotionButton, useMediaSheetMode } from "@/modules/micro-interactions";
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
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getProductGridClassName } from "@/utils/productGridClasses";
import { THEME_ALERT_DANGER_SHELL, THEME_BTN_ACCENT_SOLID } from "@/utils/themeVisuals";
import { trackEvent } from "@/services/analyticsService";
import { buildProductSharePayload } from "@/utils/productShare";
import { getProductSalesCount, hasProductSales, productSalesDetailLabel } from "@/utils/productSales";
import { buildSupportPageUrl, openCustomerService } from "@/utils/customerService";
import { cn } from "@/lib/utils";
import SeoHead from "@/components/SeoHead";
import { buildCanonical, stripHtml, truncateText } from "@/utils/seo";
import { buildProductJsonLd } from "@/utils/structuredData";
import RegulatedProductNotice from "@/components/compliance/RegulatedProductNotice";
import RestrictedAgeConfirm from "@/components/compliance/RestrictedAgeConfirm";
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

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [variantSheetOpen, setVariantSheetOpen] = useState(false);
  const [purchaseIntent, setPurchaseIntent] = useState<"cart" | "buy">("cart");
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [purchaseAgeOk, setPurchaseAgeOk] = useState(true);
  const isMobileSheet = useMediaSheetMode();
  const trackedProductIdRef = useRef<string | null>(null);
  const headerSentinelRef = useRef<HTMLDivElement>(null);

  const {
    currentProduct: product,
    relatedProducts,
    detailLoading: loading,
    error,
    loadProductDetail,
  } = useProductStore();

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
  const productGridClass = getProductGridClassName(themeConfig.productCardVariant);

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
      <div className="store-bottom-action-space min-h-screen bg-background md:pb-0">
        <ProductDetailStickyHeader
          solid={false}
          onBack={goBack}
          onShare={() => {}}
          onCart={() => navigate("/cart")}
        />
        <div className="relative">
          <Skeleton className="w-full" style={{ aspectRatio: "var(--theme-image-ratio)" }} />
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
      <div className="min-h-screen bg-[var(--theme-bg)]">
        <ProductDetailStickyHeader
          solid
          onBack={goBack}
          onShare={() => {}}
          onCart={() => navigate("/cart")}
        />
        <div
          className="p-8 text-center text-muted-foreground"
          style={{
            paddingTop: "calc(var(--store-tab-header-height, 3.5rem) + env(safe-area-inset-top, 0px) + 2rem)",
          }}
        >
          <p>{error ?? "商品不存在"}</p>
          <button
            onClick={() => id && loadProductDetail(id)}
            className="mt-4 rounded-full btn-theme-price px-6 py-2.5 text-sm font-bold text-primary-foreground"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const activeActivity = product.active_activity;
  const availableVariants = (product.variants ?? []).filter((v) => v.id && v.enabled !== false);
  const selectedVariant = availableVariants.length
    ? selectedVariantId
      ? availableVariants.find((v) => v.id === selectedVariantId) ?? null
      : availableVariants.length === 1
        ? availableVariants[0]
        : null
    : null;
  const hasMultipleVariants = availableVariants.length > 1;
  const defaultVariant = product.default_variant ?? availableVariants.find((v) => v.is_default) ?? availableVariants[0] ?? null;
  const productForCart = selectedVariant
    ? { ...product, price: selectedVariant.price, stock: selectedVariant.stock }
    : product;
  const displayPrice = selectedVariant?.price ?? product.price;
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
  const restricted = isRestrictedProduct(product);
  const showRegulatedNotice = shouldShowRegulatedNotice(
    product,
    siteCapabilities.restrictedProductComplianceEnabled,
  );
  const regulatedNoticeProps = buildRegulatedProductNoticeProps(product, siteInfo);
  const canIndex = canIndexProductDetail(product, siteInfo);
  const siteName = siteInfo.siteName || "官方商城";
  const canonical = buildCanonical(`/product/${product.id}`);
  const productDescRaw = stripHtml(product.description || "");
  const productDescription = truncateText(
    restricted
      ? "本页面包含受年龄、地区或当地法规限制的商品或服务信息，仅面向符合法定年龄并符合当地规定的用户展示。具体适用范围以当地法律法规、平台规则和客服确认为准。"
      : productDescRaw || `查看 ${product.name} 的详情、价格、库存、规格与服务信息，支持中文客服咨询。`,
    150,
  );
  const seoImage = selectedVariant?.image_url || product.cover_image || product.images?.[0] || siteInfo.defaultOgImageUrl || "/og-default.png";
  const productJsonLd = canIndex ? buildProductJsonLd(product) : null;
  const galleryImages = Array.from(new Set([...(selectedVariant?.image_url ? [selectedVariant.image_url] : []), ...(Array.isArray(product.images) && product.images.length ? product.images : []), ...(product.cover_image ? [product.cover_image] : [])].filter((url): url is string => typeof url === "string" && url.trim().length > 0)));

  const ensureVariantSelected = () => {
    if (availableVariants.length === 1 && !selectedVariantId) {
      setSelectedVariantId(availableVariants[0].id);
      return availableVariants[0];
    }
    return selectedVariant;
  };

  const purchaseAgeBlocked = Boolean(product && !purchaseAgeOk);
  const purchaseMinimumAge = product ? getRestrictedProductMinimumAge(product, siteInfo) : 18;

  const guardRestrictedPurchase = () => {
    if (!purchaseAgeBlocked) return true;
    toast.error(`该商品仅限年满 ${purchaseMinimumAge} 岁用户购买或咨询`);
    return false;
  };

  const openPurchaseSheet = (intent: "cart" | "buy") => {
    if (!guardRestrictedPurchase()) return;
    if (soldOut) {
      toast.error("库存不足");
      return;
    }
    if (availableVariants.length === 1) setSelectedVariantId(availableVariants[0].id);
    setPurchaseIntent(intent);
    setVariantSheetOpen(true);
  };

  const commitAddToCart = async () => {
    const variant = ensureVariantSelected() ?? defaultVariant;
    if (availableVariants.length > 1 && !variant) {
      toast.error("请选择商品规格");
      return;
    }
    try {
      await addItem(
        variant ? { ...product, price: variant.price, stock: variant.stock } : productForCart,
        qty,
        variant ?? defaultVariant,
      );
      trackAddToCart(productForCart, qty);
      void trackEvent({
        event_type: "add_to_cart",
        module: "product_detail",
        product_id: product.id,
        variant_id: selectedVariant?.id ?? defaultVariant?.id,
        quantity: qty,
        amount: Number(displayPrice || 0) * Number(qty || 0),
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
    const p = variant ? { ...product, price: variant.price, stock: variant.stock } : productForCart;
    useCartStore.getState().setBuyNow(p, qty, variant ?? defaultVariant);
    void trackEvent({
      event_type: "checkout_start",
      module: "product_detail",
      product_id: product.id,
      variant_id: selectedVariant?.id ?? defaultVariant?.id,
      quantity: qty,
      amount: Number(displayPrice || 0) * Number(qty || 0),
    });
    navigate("/checkout");
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
      Number(displayPrice) || 0,
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

    if (isMobileSheet) {
      setShareText(sharePayload.text);
      setShareSheetOpen(true);
      return;
    }

    const copied = await copyToClipboard(sharePayload.text);
    if (copied) {
      toast.success("商品信息已复制，可粘贴分享给好友", toastPresetQuickSuccess);
    } else {
      toast.error("复制失败，请手动复制链接");
    }
  };

  return (
    <div className="store-bottom-action-space min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] md:pb-0 lg:pb-0">
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
        onCart={() => navigate("/cart")}
      />
      <main className="mx-auto w-full max-w-screen-xl px-0 md:px-6 lg:px-8">
        <button
          type="button"
          onClick={goBack}
          className="mb-4 hidden items-center gap-1.5 px-[var(--store-page-x)] text-sm font-medium text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] lg:inline-flex lg:px-0"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start md:py-6 lg:gap-12 lg:py-8">
          <div className={cn("md:sticky md:self-start", STORE_DETAIL_STICKY_TOP_CLASS)}>
            <div className="relative overflow-hidden md:theme-rounded md:border md:border-[var(--theme-border)]">
              <ProductImageGallery
                images={galleryImages}
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
                className="px-[var(--store-page-x)] pt-5 md:px-0 md:pt-0"
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
                    {typeof product.original_price === "number" &&
                      product.original_price > Number(displayPrice) && (
                        <span className="store-body-small text-muted-foreground line-through">
                          RM {product.original_price}
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
              {activeActivity ? (
                <div className={`mt-3 theme-rounded px-3 py-2 text-xs ${THEME_ALERT_DANGER_SHELL}`}>
                  <div className="font-bold">{activeActivity.title}</div>
                </div>
              ) : null}
              {showRegulatedNotice ? <RegulatedProductNotice {...regulatedNoticeProps} /> : null}
              {purchaseAgeBlocked ? (
                <RestrictedAgeConfirm
                  requiredAge={purchaseMinimumAge}
                  onConfirmed={() => setPurchaseAgeOk(true)}
                />
              ) : null}
              <ProductTagList tags={product.tags} max={6} size="md" className="mt-3" />
              </div>
              <div className="mt-4 hidden max-w-xl md:block">
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

            {/* TrustInfo - 信任三件套（详情页使用 card 强转化样式） */}
            <div className="mt-6 px-[var(--store-page-x)] md:px-0">
              <TrustInfo variant="card" />
            </div>

            {/* 描述 */}
            <div className="mt-8 border-t border-[var(--theme-border)] px-[var(--store-page-x)] pt-6 md:mt-10 md:theme-rounded md:border md:bg-[var(--theme-surface)]/40 md:p-6">
              <h3 className="mb-3 text-sm font-semibold text-foreground md:mb-4">商品详情</h3>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {detailSections.map((section, idx) => (
                  <div key={`${section.slice(0, 12)}-${idx}`} className="rounded-lg border border-[var(--theme-border)]/60 bg-[var(--theme-surface)]/50 p-3">
                    {section}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 评论 */}
        <ProductReviews vm={reviewsVm} />

        {/* 同类推荐 */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-[var(--theme-border)] px-[var(--store-page-x)] py-8 md:border-0 md:px-0 md:py-12">
            <h3 className="mb-4 text-sm font-semibold text-foreground md:mb-5 md:text-lg">
              同类推荐
            </h3>
            <div className={`${productGridClass} md:gap-5`}>
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </main>
      {/* 底部固定操作栏 - 仅移动端 */}
      <div className="fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
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
        onConfirm={() => {
          setVariantSheetOpen(false);
          if (purchaseIntent === "cart") void commitAddToCart();
          else commitBuyNow();
        }}
      />

      <BottomSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        title="分享商品"
        height="auto"
        stickyFooter
        footer={
          <button
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
          </button>
        }
      >
        <p className="whitespace-pre-wrap text-sm text-[var(--theme-text-muted)]">{shareText}</p>
      </BottomSheet>
    </div>
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
  const disabled = soldOut || purchaseBlocked;
  return (
    <div className="flex items-stretch gap-3">
      <div className="flex shrink-0 items-center gap-4 pr-1">
        <div className="flex min-w-[2.75rem] flex-col items-center gap-0.5 text-[var(--theme-text-muted)]">
          <FavoriteMotionButton active={isFavorite} onClick={onFavorite} className="h-9 w-9" size={18} />
          <span className="text-[10px]">{isFavorite ? "已收藏" : "收藏"}</span>
        </div>
        <button
          type="button"
          onClick={onCustomerService}
          className="flex min-w-[2.75rem] flex-col items-center gap-0.5 text-[var(--theme-text-muted)]"
          aria-label="联系客服"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)]">
            <Headphones size={18} strokeWidth={2} />
          </span>
          <span className="text-[10px]">客服</span>
        </button>
      </div>
      <div className="w-px shrink-0 self-stretch bg-[var(--theme-border)]" aria-hidden />
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-full shadow-sm">
        <button
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
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onBuyNow}
          className={cn(
            "min-h-11 flex-1 px-2 text-sm font-semibold transition-opacity",
            "bg-[var(--theme-price)] text-[var(--theme-price-foreground)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {soldOut ? "已售罄" : purchaseBlocked ? "需年龄确认" : "立即购买"}
        </button>
      </div>
    </div>
  );
}

function buildDetailSections(description: string): string[] {
  const raw = (description || "").trim();
  if (!raw) return ["暂无详情描述"];
  const parts = raw
    .split(/\n+|[；;。]/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [raw];
}
