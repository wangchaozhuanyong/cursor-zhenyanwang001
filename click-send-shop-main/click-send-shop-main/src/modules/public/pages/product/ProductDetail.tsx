import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Heart, Minus, Plus, Share2, ShoppingCart, ShieldCheck, Truck, WalletCards } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useCartStore } from "@/stores/useCartStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import ProductCard from "@/components/ProductCard";
import ProductReviews from "@/components/ProductReviews";
import { useProductReviews } from "@/hooks/useProductReviews";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductTagList from "@/components/ProductTagList";
import { SquishButton } from "@/modules/micro-interactions";
import TrustInfo from "@/components/TrustInfo";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGoBack } from "@/hooks/useGoBack";
import { copyToClipboard } from "@/utils/clipboard";
import { trackAddToCart, trackProductView } from "@/utils/tracking";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { parseSstEnabled } from "@/utils/sstTax";
import NotificationIconButton from "@/components/NotificationIconButton";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const addItem = useCartStore((s) => s.addItem);
  const totalItems = useCartStore((s) => s.totalItems());
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const trackedProductIdRef = useRef<string | null>(null);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  const {
    currentProduct: product,
    relatedProducts,
    detailLoading: loading,
    error,
    loadProductDetail,
  } = useProductStore();

  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const isFavorite = useFavoritesStore((s) => (id ? s.isFavorite(id) : false));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const reviewsVm = useProductReviews(id ?? "");
  const siteInfo = useSiteInfo();
  const sstNote = (siteInfo.sstCustomerNote || "").trim();
  const showSstHint = parseSstEnabled(siteInfo.sstEnabled);

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
  }, [product]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!product) return;
    const active = product.active_activity;
    const remaining = active ? Math.max(0, active.remaining_stock ?? 0) : product.stock;
    const limit = active?.limit_per_user && active.limit_per_user > 0 ? active.limit_per_user : product.stock;
    const max = Math.max(1, Math.min(product.stock, remaining, limit));
    setQty((prev) => Math.min(prev, max));
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-0">
        <DetailHeader goBack={goBack} totalItems={totalItems} unreadCount={unreadCount} />
        <div className="mx-auto w-full max-w-screen-xl px-0 md:px-6">
          <div className="md:grid md:grid-cols-2 md:gap-10 md:py-10">
            <Skeleton className="w-full md:rounded-2xl" style={{ aspectRatio: "var(--theme-image-ratio)" }} />
            <div className="space-y-3 p-4 md:p-0">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader goBack={goBack} totalItems={totalItems} unreadCount={unreadCount} />
        <div className="p-8 text-center text-muted-foreground">
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
    ? availableVariants.find((v) => v.id === selectedVariantId)
      ?? availableVariants.find((v) => v.is_default)
      ?? availableVariants[0]
    : null;
  const productForCart = selectedVariant
    ? { ...product, price: selectedVariant.price, stock: selectedVariant.stock }
    : product;
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayStock = selectedVariant?.stock ?? product.stock;
  const activityRemaining = activeActivity ? Math.max(0, activeActivity.remaining_stock ?? 0) : product.stock;
  const activityLimit = activeActivity?.limit_per_user && activeActivity.limit_per_user > 0
    ? activeActivity.limit_per_user
    : product.stock;
  const maxQty = Math.max(1, Math.min(displayStock, activityRemaining, activityLimit));
  const detailSections = buildDetailSections(product.description);

  const handleAddToCart = () => {
    if (availableVariants.length && !selectedVariant) {
      toast.error("请选择商品规格");
      return;
    }
    addItem(productForCart, qty, selectedVariant);
    trackAddToCart(productForCart, qty);
    toast.success(`已加入购物车 x${qty}`, toastPresetQuickSuccess);
  };

  const handleBuyNow = () => {
    if (availableVariants.length && !selectedVariant) {
      toast.error("请选择商品规格");
      return;
    }
    useCartStore.getState().setBuyNow(productForCart, qty, selectedVariant);
    navigate("/checkout");
  };

  const handleFavorite = () => {
    toggleFavorite(product);
    toast.success(isFavorite ? "已取消收藏" : "已收藏", toastPresetQuickSuccess);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} - RM ${product.price}`,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancellation should not block the manual copy fallback.
      }
    }

    const copied = await copyToClipboard(window.location.href);
    if (copied) {
      toast.success("链接已复制", toastPresetQuickSuccess);
    } else {
      toast.error("复制失败，请手动复制链接");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-28 md:pb-0">
      <DetailHeader
        goBack={goBack}
        totalItems={totalItems}
        unreadCount={unreadCount}
        onShare={handleShare}
      />

      <main className="mx-auto w-full max-w-screen-xl px-0 md:px-6">
        {/* 桌面端双列：左图 / 右信息 */}
        <div className="md:grid md:grid-cols-2 md:gap-10 md:py-10">
          {/* 左：图集 */}
          <div className="md:sticky md:top-20 md:self-start">
            <div className="md:overflow-hidden md:theme-rounded md:border md:border-[var(--theme-border)]">
              <ProductImageGallery images={product.images} name={product.name} videoUrl={product.video_url} />
            </div>
          </div>

          {/* 右：商品信息 + 操作 */}
          <div>
            {/* 标签 + 标题 */}
            <div className="px-4 pt-5 md:px-0 md:pt-0">
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
                  <span className="theme-rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
                    {activeActivity.type === "flash_sale" ? "限时秒杀" : "满减活动"}
                  </span>
                )}
                <ProductTagList tags={product.tags} max={6} size="md" />
                <span className="text-xs text-muted-foreground">
                  库存: {displayStock} 件
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
                <span className="text-xs text-muted-foreground">
                  +{product.points} 积分
                </span>
              </div>
              {typeof product.sales_count === "number" && product.sales_count > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  已售 {product.sales_count.toLocaleString()} 件
                </p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 py-2 text-center">
                  <Truck size={14} className="mx-auto text-[var(--theme-primary)]" />
                  <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">本地配送</p>
                </div>
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 py-2 text-center">
                  <WalletCards size={14} className="mx-auto text-[var(--theme-primary)]" />
                  <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">安全支付</p>
                </div>
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 py-2 text-center">
                  <ShieldCheck size={14} className="mx-auto text-[var(--theme-primary)]" />
                  <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">售后保障</p>
                </div>
              </div>
              {showSstHint && (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {sstNote || "商品价格已含 SST，运费不计税。"}
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
                      <button
                        key={variant.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setQty((prev) => Math.min(prev, Math.max(1, variant.stock)));
                        }}
                        className={`min-h-16 rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          active
                            ? "border-[var(--theme-price)] bg-[var(--theme-price)]/10 text-foreground"
                            : "border-[var(--theme-border)] bg-background text-muted-foreground hover:border-[var(--theme-price)]/60"
                        }`}
                      >
                        <span className="block truncate font-semibold">{variant.title || variant.sku_code || "默认规格"}</span>
                        <span className="mt-1 block">RM {variant.price}</span>
                        <span className="mt-0.5 block">库存 {variant.stock}</span>
                      </button>
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
                  onClick={() => setQty(Math.min(maxQty, qty + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full active:bg-[var(--theme-bg)] touch-target !p-0"
                >
                  <Plus size={16} className="text-foreground" />
                </SquishButton>
              </div>
            </div>

            {/* 桌面端：操作按钮（移动端使用底部固定栏） */}
            <div className="mt-4 hidden gap-3 px-0 md:flex">
              <SquishButton
                type="button"
                variant="outline"
                onClick={handleAddToCart}
                className="flex-1 rounded-full py-3.5 text-sm font-semibold transition-all !min-h-0"
              >
                加入购物车
              </SquishButton>
              <SquishButton
                type="button"
                variant="gold"
                onClick={handleBuyNow}
                className="flex-1 rounded-full py-3.5 text-sm font-semibold transition-all hover:opacity-95 shadow-lg shadow-gold/20 !min-h-0"
              >
                立即购买
              </SquishButton>
              <SquishButton
                type="button"
                variant="ghost"
                onClick={handleFavorite}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-bg)] !p-0"
                aria-label="收藏"
              >
                <Heart
                  size={20}
                  className={
                    isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
                  }
                />
              </SquishButton>
            </div>

            {/* 移动端：收藏按钮浮在右上角（保留交互） */}
            <SquishButton
              type="button"
              variant="ghost"
              onClick={handleFavorite}
              className="fixed right-4 top-16 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 backdrop-blur-sm theme-shadow md:hidden touch-target !p-0"
              aria-label="收藏"
            >
              <Heart
                size={18}
                className={`transition-colors ${
                  isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
                }`}
              />
            </SquishButton>

            {/* TrustInfo - 信任三件套（详情页使用 card 强转化样式） */}
            <div className="mt-6 px-4 md:px-0">
              <TrustInfo variant="card" />
            </div>

            {/* 服务保障 */}
            <div className="mt-6 grid grid-cols-2 gap-2 px-4 md:px-0">
              <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-xs text-[var(--theme-text-muted)]">
                <p className="font-semibold text-[var(--theme-text)]">配送保障</p>
                <p className="mt-1">本地仓发货，支持物流追踪</p>
              </div>
              <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-xs text-[var(--theme-text-muted)]">
                <p className="font-semibold text-[var(--theme-text)]">售后保障</p>
                <p className="mt-1">7 天内可申请售后服务</p>
              </div>
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
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <SquishButton
            type="button"
            variant="outline"
            onClick={handleAddToCart}
            className="flex-1 rounded-full py-3.5 text-sm font-semibold transition-all !min-h-0"
          >
            加入购物车
          </SquishButton>
          <SquishButton
            type="button"
            variant="gold"
            onClick={handleBuyNow}
            className="flex-1 rounded-full py-3.5 text-sm font-semibold transition-all shadow-lg shadow-gold/20 !min-h-0"
          >
            立即购买
          </SquishButton>
        </div>
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

/** 详情页统一 Header（移动 / 桌面共用，桌面端容器宽） */
function DetailHeader({
  goBack,
  totalItems,
  unreadCount,
  onShare,
}: {
  goBack: () => void;
  totalItems: number;
  unreadCount: number;
  onShare?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-4 py-3 md:px-6">
        <SquishButton
          type="button"
          variant="ghost"
          onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)] touch-target !p-0"
          aria-label="返回"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </SquishButton>
        <span className="text-sm font-medium text-foreground">商品详情</span>
        <div className="flex items-center gap-1">
          {onShare && (
            <SquishButton
              type="button"
              variant="ghost"
              onClick={onShare}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)] touch-target !p-0"
              aria-label="分享"
            >
              <Share2 size={18} className="text-foreground" />
            </SquishButton>
          )}
          <SquishButton
            type="button"
            variant="ghost"
            onClick={() => navigate("/cart")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)] touch-target !p-0"
            aria-label="购物车"
          >
            <ShoppingCart size={20} className="text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-foreground">
                {totalItems}
              </span>
            )}
          </SquishButton>
          <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} />
        </div>
      </div>
    </header>
  );
}
