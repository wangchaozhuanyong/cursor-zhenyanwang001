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
      <div className="min-h-screen bg-background pb-28">
        <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur-md">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground">商品详情</span>
          <div className="w-10" />
        </header>
        <div className="mx-auto max-w-lg">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-3 p-4">
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
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur-md">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground">商品详情</span>
          <div className="w-10" />
        </header>
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
      navigator.share({ title: product.name, text: `${product.name} - RM ${product.price}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("链接已复制");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur-md">
        <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary active:bg-muted touch-target">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">商品详情</span>
        <div className="flex items-center gap-1">
          <button onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <Share2 size={18} className="text-foreground" />
          </button>
          <button onClick={() => navigate("/cart")} className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ShoppingCart size={20} className="text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-foreground">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Image Gallery */}
        <ProductImageGallery images={product.images} name={product.name} />

        {/* Info */}
        <div className="px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-2xl font-bold text-gold">RM {product.price}</span>
              <span className="ml-2 text-xs text-muted-foreground">+{product.points}积分</span>
            </div>
            <div className="flex items-center gap-2">
              {product.is_hot && (
                <span className="rounded-md bg-gold px-2 py-1 text-[10px] font-bold text-primary-foreground">热销</span>
              )}
              {product.is_new && (
                <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">新品</span>
              )}
              <button
                onClick={handleFavorite}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:scale-90 transition-transform touch-target"
              >
                <Heart
                  size={20}
                  className={`transition-colors ${isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
                />
              </button>
            </div>
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold leading-snug text-foreground">{product.name}</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            库存: {product.stock} 件
          </p>
        </div>

        {/* Qty */}
        <div className="flex items-center justify-between border-t border-border px-4 py-4">
          <span className="text-sm font-medium text-foreground">数量</span>
          <div className="flex items-center gap-3 rounded-full border border-border px-1.5">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-9 w-9 items-center justify-center active:bg-secondary rounded-full touch-target">
              <Minus size={16} className="text-foreground" />
            </button>
            <span className="min-w-[28px] text-center text-sm font-bold text-foreground">{qty}</span>
            <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="flex h-9 w-9 items-center justify-center active:bg-secondary rounded-full touch-target">
              <Plus size={16} className="text-foreground" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="border-t border-border px-4 py-5">
          <h3 className="mb-2.5 text-sm font-semibold text-foreground">商品详情</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        </div>

        {/* Reviews */}
        <ProductReviews vm={reviewsVm} />

        {/* Related */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-border px-4 py-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">同类推荐</h3>
            <div className="grid grid-cols-2 gap-3">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md pb-safe safe-bottom-bar">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button
            onClick={handleAddToCart}
            className="flex-1 rounded-full border-2 border-primary py-3.5 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
          >
            加入购物车
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-1 rounded-full bg-gold py-3.5 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]"
          >
            立即购买
          </button>
        </div>
      </div>
    </div>
  );
}
