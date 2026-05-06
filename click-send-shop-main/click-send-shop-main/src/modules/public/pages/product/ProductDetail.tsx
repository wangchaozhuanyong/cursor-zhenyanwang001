import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Minus, Plus, Share2, ShoppingCart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useCartStore } from "@/stores/useCartStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import ProductCard from "@/components/ProductCard";
import ProductReviews from "@/components/ProductReviews";
import { useProductReviews } from "@/hooks/useProductReviews";
import ProductImageGallery from "@/components/ProductImageGallery";
import { SquishButton } from "@/modules/micro-interactions";
import TrustInfo from "@/components/TrustInfo";
import SiteFooter from "@/components/SiteFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGoBack } from "@/hooks/useGoBack";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const addItem = useCartStore((s) => s.addItem);
  const totalItems = useCartStore((s) => s.totalItems());
  const [qty, setQty] = useState(1);

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

  useDocumentTitle(product?.name);

  useEffect(() => {
    if (id) {
      loadProductDetail(id);
      setQty(1);
    }
  }, [id, loadProductDetail]);

  useEffect(() => {
    if (product) addToHistory(product);
  }, [product?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-0">
        <DetailHeader goBack={goBack} totalItems={totalItems} />
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
        <DetailHeader goBack={goBack} totalItems={totalItems} />
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

  const handleAddToCart = () => {
    addItem(product, qty);
    toast.success(`已加入购物车 x${qty}`);
  };

  const handleBuyNow = () => {
    useCartStore.getState().setBuyNow(product, qty);
    navigate("/checkout");
  };

  const handleFavorite = () => {
    toggleFavorite(product.id);
    toast.success(isFavorite ? "已取消收藏" : "已收藏");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `${product.name} - RM ${product.price}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("链接已复制");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-28 md:pb-0">
      <DetailHeader
        goBack={goBack}
        totalItems={totalItems}
        onShare={handleShare}
      />

      <main className="mx-auto w-full max-w-screen-xl px-0 md:px-6">
        {/* 桌面端双列：左图 / 右信息 */}
        <div className="md:grid md:grid-cols-2 md:gap-10 md:py-10">
          {/* 左：图集 */}
          <div className="md:sticky md:top-20 md:self-start">
            <div className="md:overflow-hidden md:theme-rounded md:border md:border-[var(--theme-border)]">
              <ProductImageGallery images={product.images} name={product.name} />
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
                <span className="text-xs text-muted-foreground">
                  库存: {product.stock} 件
                </span>
              </div>
              <h1 className="mt-3 font-display text-xl font-semibold leading-snug text-foreground md:text-3xl md:leading-tight">
                {product.name}
              </h1>
            </div>

            {/* 价格 */}
            <div className="px-4 pt-3 md:px-0 md:pt-5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-[var(--theme-price)] md:text-4xl">
                  RM {product.price}
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
            </div>

            {/* 数量 */}
            <div className="mt-4 flex items-center justify-between border-t border-[var(--theme-border)] px-4 py-4 md:mt-6 md:theme-rounded md:border md:bg-[var(--theme-surface)] md:px-5">
              <span className="text-sm font-medium text-foreground">数量</span>
              <div className="flex items-center gap-3 rounded-full border border-[var(--theme-border)] px-1.5">
                <SquishButton
                  type="button"
                  aria-label="减少数量"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent active:bg-[var(--theme-bg)] touch-target shadow-none !p-0"
                >
                  <Minus size={16} className="text-foreground" />
                </SquishButton>
                <span className="min-w-[28px] text-center text-sm font-bold text-foreground">
                  {qty}
                </span>
                <SquishButton
                  type="button"
                  aria-label="增加数量"
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent active:bg-[var(--theme-bg)] touch-target shadow-none !p-0"
                >
                  <Plus size={16} className="text-foreground" />
                </SquishButton>
              </div>
            </div>

            {/* 桌面端：操作按钮（移动端使用底部固定栏） */}
            <div className="mt-4 hidden gap-3 px-0 md:flex">
              <SquishButton
                type="button"
                onClick={handleAddToCart}
                className="flex-1 rounded-full border-2 border-[var(--theme-primary)] py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-[var(--theme-bg)] shadow-none !min-h-0"
              >
                加入购物车
              </SquishButton>
              <SquishButton
                type="button"
                onClick={handleBuyNow}
                className="flex-1 rounded-full bg-gold py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95 shadow-none !min-h-0"
              >
                立即购买
              </SquishButton>
              <SquishButton
                type="button"
                onClick={handleFavorite}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-bg)] shadow-none !p-0"
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
              onClick={handleFavorite}
              className="fixed right-4 top-16 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 backdrop-blur-sm theme-shadow md:hidden touch-target shadow-none !p-0"
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

            {/* 描述 */}
            <div className="mt-8 border-t border-[var(--theme-border)] px-4 pt-6 md:mt-10 md:theme-rounded md:border md:bg-[var(--theme-surface)]/40 md:p-6">
              <h3 className="mb-3 text-sm font-semibold text-foreground md:mb-4">商品详情</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
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

      <div className="hidden md:block">
        <SiteFooter />
      </div>

      {/* 底部固定操作栏 - 仅移动端 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <SquishButton
            type="button"
            onClick={handleAddToCart}
            className="flex-1 rounded-full border-2 border-[var(--theme-primary)] py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-[var(--theme-bg)] shadow-none !min-h-0"
          >
            加入购物车
          </SquishButton>
          <SquishButton
            type="button"
            onClick={handleBuyNow}
            className="flex-1 rounded-full bg-gold py-3.5 text-sm font-semibold text-primary-foreground transition-all shadow-none !min-h-0"
          >
            立即购买
          </SquishButton>
        </div>
      </div>
    </div>
  );
}

/** 详情页统一 Header（移动 / 桌面共用，桌面端容器宽） */
function DetailHeader({
  goBack,
  totalItems,
  onShare,
}: {
  goBack: () => void;
  totalItems: number;
  onShare?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-4 py-3 md:px-6">
        <SquishButton
          type="button"
          onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent hover:bg-[var(--theme-bg)] touch-target shadow-none !p-0"
          aria-label="返回"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </SquishButton>
        <span className="text-sm font-medium text-foreground">商品详情</span>
        <div className="flex items-center gap-1">
          {onShare && (
            <SquishButton
              type="button"
              onClick={onShare}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent hover:bg-[var(--theme-bg)] touch-target shadow-none !p-0"
              aria-label="分享"
            >
              <Share2 size={18} className="text-foreground" />
            </SquishButton>
          )}
          <SquishButton
            type="button"
            onClick={() => navigate("/cart")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-transparent hover:bg-[var(--theme-bg)] touch-target shadow-none !p-0"
            aria-label="购物车"
          >
            <ShoppingCart size={20} className="text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-foreground">
                {totalItems}
              </span>
            )}
          </SquishButton>
        </div>
      </div>
    </header>
  );
}
