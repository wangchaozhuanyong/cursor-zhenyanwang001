import { useState, useEffect, useRef } from "react";
import { Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useCartStore } from "@/stores/useCartStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import ProductCard from "@/components/ProductCard";
import ProductReviews from "@/components/ProductReviews";
import { useProductReviews } from "@/hooks/useProductReviews";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductDetailStickyHeader from "@/components/product/ProductDetailStickyHeader";
import { useProductDetailHeaderSolid } from "@/hooks/useProductDetailHeaderSolid";
import ProductTagList from "@/components/ProductTagList";
import {
  AddToCartFeedback,
  BottomSheet,
  FavoriteMotionButton,
  SquishButton,
  useMediaSheetMode,
} from "@/modules/micro-interactions";
import ProductVariantSheet from "@/components/product/ProductVariantSheet";
import { motion } from "framer-motion";
import TrustInfo from "@/components/TrustInfo";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGoBack } from "@/hooks/useGoBack";
import { copyToClipboard } from "@/utils/clipboard";
import { trackAddToCart, trackProductView } from "@/utils/tracking";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { trackEvent } from "@/services/analyticsService";
import { buildProductSharePayload } from "@/utils/productShare";

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

  useDocumentTitle(product?.name);

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
        <div className="mx-auto w-full max-w-screen-xl px-4 pt-4 md:px-6 md:py-10">
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
            className="mt-4 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-primary-foreground"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const activeActivity = product.active_activity;
  const availableVariants = (product.variants ?? []).filter((v) => v.id);
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
  const detailSections = buildDetailSections(product.description);
  const galleryImages = Array.from(new Set([...(Array.isArray(product.images) && product.images.length ? product.images : []), ...(product.cover_image ? [product.cover_image] : [])].filter((url): url is string => typeof url === "string" && url.trim().length > 0)));

  const ensureVariantSelected = () => {
    if (availableVariants.length === 1 && !selectedVariantId) {
      setSelectedVariantId(availableVariants[0].id);
      return availableVariants[0];
    }
    return selectedVariant;
  };

  const openPurchaseSheet = (intent: "cart" | "buy") => {
    if (soldOut) {
      toast.error("库存不足");
      return;
    }
    if (isMobileSheet) {
      if (availableVariants.length === 1) setSelectedVariantId(availableVariants[0].id);
      setPurchaseIntent(intent);
      setVariantSheetOpen(true);
      return;
    }
    if (availableVariants.length > 1 && !selectedVariant) {
      toast.error("请选择商品规格");
      return;
    }
    if (intent === "cart") void commitAddToCart();
    else commitBuyNow();
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

  const handleShare = async () => {
    const url = window.location.href;
    const sharePayload = buildProductSharePayload(
      product.name,
      Number(displayPrice) || 0,
      url,
      siteInfo.siteName,
    );
    void trackEvent({ event_type: "share", module: "product_detail", product_id: product.id });

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
    <div className="store-bottom-action-space min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] md:pb-0">
      <ProductDetailStickyHeader
        solid={headerSolid}
        onBack={goBack}
        onShare={handleShare}
        onCart={() => navigate("/cart")}
      />
      <main className="mx-auto w-full max-w-screen-xl px-0 md:px-6">
        <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start md:py-10">
          <div className="md:sticky md:top-[calc(var(--store-tab-header-height,3.5rem)+env(safe-area-inset-top,0px)+1.5rem)] md:self-start">
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
            <div
              ref={headerSentinelRef}
              className="pointer-events-none h-px w-full shrink-0"
              aria-hidden
            />
            {/* 标签 + 标题 */}
            <div
              className="px-4 pt-5 md:px-0 md:pt-0"
              style={
                headerSolid
                  ? { scrollMarginTop: "calc(var(--store-tab-header-height, 3.5rem) + env(safe-area-inset-top, 0px))" }
                  : undefined
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                {product.is_hot && (
                  <span className="theme-rounded bg-[var(--theme-price)] px-2 py-1 text-[10px] font-bold text-[var(--theme-price-foreground)]">
                    热销
                  </span>
                )}
                {product.is_new && (
                  <span className="theme-rounded bg-[var(--theme-primary)] px-2 py-1 text-[10px] font-bold text-[var(--theme-primary-foreground)]">
                    新品
                  </span>
                )}
                {activeActivity && (
                  <span className="theme-rounded bg-[var(--theme-danger)] px-2 py-1 text-[10px] font-bold text-[var(--theme-danger-foreground)]">
                    {activeActivity.type === "flash_sale" ? "限时秒杀" : "满减活动"}
                  </span>
                )}
                <ProductTagList tags={product.tags} max={6} size="md" />
                <span className="text-xs text-muted-foreground">
                  库存: {Math.max(0, displayStock)} 件
                </span>
              </div>
              <h1 className="mt-3 font-display text-xl font-semibold leading-snug text-foreground md:text-3xl md:leading-tight">
                {product.name}
              </h1>
            </div>

            {/* 价格 */}
            <div className="px-4 pt-3 md:px-0 md:pt-5">
              {activeActivity && (
                <div className="mb-3 theme-rounded border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
                  <div className="font-bold">{activeActivity.title}</div>
                  {activeActivity.type === "full_reduction"
                    && activeActivity.threshold_amount != null
                    && activeActivity.discount_amount != null
                    && activeActivity.threshold_amount > 0
                    && activeActivity.discount_amount > 0 && (
                    <div className="mt-1 text-xs font-semibold">
                      满 RM {activeActivity.threshold_amount} 减 RM {activeActivity.discount_amount}（购物车中本活动商品合计达标后减免一次）
                    </div>
                  )}
                  <div className="mt-1 text-xs opacity-85">
                    活动库存剩余 {activeActivity.remaining_stock} 件
                    {activeActivity.limit_per_user > 0 ? ` · 每单限购 ${activeActivity.limit_per_user} 件` : ""}
                    {" · "}截止 {new Date(activeActivity.end_at).toLocaleString("zh-CN")}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-[var(--theme-price)] md:text-4xl">
                  RM {displayPrice}
                </span>
                {typeof product.original_price === "number"
                  && product.original_price > product.price && (
                    <>
                      <span className="text-sm text-muted-foreground line-through">
                        RM {product.original_price}
                      </span>
                      <span className="theme-rounded bg-[var(--theme-price)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-price)]">
                        省 RM {(product.original_price - product.price).toFixed(2)}
                      </span>
                    </>
                  )}
              </div>
              {typeof product.sales_count === "number" && product.sales_count > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  已售 {product.sales_count.toLocaleString()} 件
                </p>
              )}
            </div>

            {availableVariants.length > 0 && (
              <div className="mt-4 border-t border-[var(--theme-border)] px-4 py-4 md:mt-6 md:theme-rounded md:border md:bg-[var(--theme-surface)] md:px-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">规格</span>
                  {selectedVariant?.sku_code && (
                    <span className="text-xs text-muted-foreground">SKU：{selectedVariant.sku_code}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availableVariants.map((variant) => {
                    const active = selectedVariant?.id === variant.id;
                    const disabled = variant.stock <= 0;
                    return (
                      <motion.button
                        key={variant.id}
                        type="button"
                        disabled={disabled}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setQty((prev) => (variant.stock > 0 ? Math.max(1, Math.min(prev, variant.stock)) : 0));
                        }}
                        className={`min-h-16 rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          active
                            ? "border-[var(--theme-price)] bg-[var(--theme-price)]/10 text-foreground ring-2 ring-[var(--theme-price)]/30"
                            : "border-[var(--theme-border)] bg-background text-muted-foreground hover:border-[var(--theme-price)]/60"
                        }`}
                      >
                        <span className="block truncate font-semibold">{variant.title || variant.sku_code || "默认规格"}</span>
                        <span className="mt-1 block">RM {variant.price}</span>
                        <span className="mt-0.5 block">库存 {variant.stock}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* 数量 */}
            <div className="mt-4 flex items-center justify-between border-t border-[var(--theme-border)] px-4 py-4 md:mt-6 md:theme-rounded md:border md:bg-[var(--theme-surface)] md:px-5">
              <span className="text-sm font-medium text-foreground">数量</span>
              <div className="flex items-center gap-3 rounded-full border border-[var(--theme-border)] px-1.5">
                <SquishButton
                  type="button"
                  variant="ghost"
                  aria-label="减少数量"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={soldOut}
                  className="flex h-9 w-9 items-center justify-center rounded-full active:bg-[var(--theme-bg)] touch-target !p-0"
                >
                  <Minus size={16} className="text-foreground" />
                </SquishButton>
                <span className="min-w-[28px] text-center text-sm font-bold text-foreground">
                  {qty}
                </span>
                <SquishButton
                  type="button"
                  variant="ghost"
                  aria-label="增加数量"
                  onClick={() => setQty(Math.min(maxQty, Math.max(1, qty + 1)))}
                  disabled={soldOut}
                  className="flex h-9 w-9 items-center justify-center rounded-full active:bg-[var(--theme-bg)] touch-target !p-0"
                >
                  <Plus size={16} className="text-foreground" />
                </SquishButton>
              </div>
            </div>

            <div className="mt-4 hidden px-0 md:block">
              <DetailPurchaseBar
                soldOut={soldOut}
                isFavorite={isFavorite}
                onFavorite={handleFavorite}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            </div>

            {/* TrustInfo - 信任三件套（详情页使用 card 强转化样式） */}
            <div className="mt-6 px-4 md:px-0">
              <TrustInfo variant="card" />
            </div>

            {/* 描述 */}
            <div className="mt-8 border-t border-[var(--theme-border)] px-4 pt-6 md:mt-10 md:theme-rounded md:border md:bg-[var(--theme-surface)]/40 md:p-6">
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
          <div className="border-t border-[var(--theme-border)] px-4 py-8 md:border-0 md:px-0 md:py-12">
            <h3 className="mb-4 text-sm font-semibold text-foreground md:mb-5 md:text-lg">
              同类推荐
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5 lg:grid-cols-5">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </main>
      {/* 底部固定操作栏 - 仅移动端 */}
      <div className="fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
        <div className="mx-auto max-w-lg px-4 py-3">
          <DetailPurchaseBar
            soldOut={soldOut}
            isFavorite={isFavorite}
            onFavorite={handleFavorite}
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

/** 详情页购买操作条：左收藏 + 购物车，右立即购买 */
function DetailPurchaseBar({
  soldOut,
  isFavorite,
  onFavorite,
  onAddToCart,
  onBuyNow,
}: {
  soldOut: boolean;
  isFavorite: boolean;
  onFavorite: () => void;
  onAddToCart: () => void | Promise<void>;
  onBuyNow: () => void;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="flex shrink-0 items-stretch gap-1">
        <div className="flex min-w-[3.25rem] flex-col items-center gap-0.5">
          <FavoriteMotionButton active={isFavorite} onClick={onFavorite} className="h-10 w-10" size={18} />
          <span className="text-[10px] text-[var(--theme-text-muted)]">{isFavorite ? "已收藏" : "收藏"}</span>
        </div>
        <AddToCartFeedback
          onAdd={onAddToCart}
          variant="outline"
          idleLabel="加购"
          successLabel="已加入"
          className="!min-h-[3.25rem] !flex-1"
          toastMessage="已加入购物车"
        />
      </div>
      <SquishButton
        type="button"
        variant="gold"
        onClick={onBuyNow}
        disabled={soldOut}
        className="min-h-[3.25rem] flex-1 rounded-full py-3.5 text-sm font-semibold shadow-lg shadow-gold/20 transition-all !min-h-[3.25rem]"
      >
        {soldOut ? "已售罄" : "立即购买"}
      </SquishButton>
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

