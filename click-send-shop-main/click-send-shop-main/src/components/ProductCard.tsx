import { Heart, ShoppingCart } from "lucide-react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import type { Product } from "@/types/product";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import Reveal from "@/components/Reveal";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { ProgressiveImage, SquishButton } from "@/modules/micro-interactions";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import ProductTagList from "@/components/ProductTagList";
import { trackAddToCart } from "@/utils/tracking";
import StoreBadge from "@/components/ui/StoreBadge";
import StorePrice from "@/components/ui/StorePrice";
import StoreButton from "@/components/ui/StoreButton";
import { isLoggedIn } from "@/utils/token";
import { trackEvent } from "@/services/analyticsService";

interface Props { product: Product; index?: number; }

function formatSales(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}w+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  return String(n);
}

export default function ProductCard({ product, index = 0 }: Props) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(product.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const { themeConfig } = useThemeRuntime();
  const cardCenter = themeConfig.cardTextAlign === "center";
  const cardVariant = themeConfig.productCardVariant ?? "standard";
  const defaultVariant = product.default_variant ?? (product.variants?.length === 1 ? product.variants[0] : null);
  const displayStock = Number(defaultVariant?.stock ?? product.stock ?? 0);
  const soldOut = displayStock <= 0;

  const onAddToCart = async (event?: MouseEvent) => {
    event?.stopPropagation();
    if (soldOut) {
      toast.error("库存不足");
      return;
    }
    try {
      await addItem(product, 1, defaultVariant);
      trackAddToCart(product, 1);
      void trackEvent({ event_type: "add_to_cart", module: "product_card", product_id: product.id, quantity: 1, amount: Number(product.price || 0) });
      toast.success("已加入购物车", toastPresetQuickSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加入购物车失败");
    }
  };

  const onToggleFavorite = async (event?: MouseEvent) => {
    event?.stopPropagation();
    try {
      const favorited = await toggleFavorite(product);
      void trackEvent({ event_type: "favorite", module: "product_card", product_id: product.id, quantity: favorited ? 1 : 0 });
      toast.success(favorited ? "已收藏" : "已取消收藏", toastPresetQuickSuccess);
      if (!isLoggedIn()) toast.message("登录后可同步收藏");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "收藏操作失败");
    }
  };

  const openDetail = (module: string) => {
    void trackEvent({ event_type: "product_click", module, product_id: product.id });
    navigate(`/product/${product.id}`);
  };

  if (cardVariant === "compact") {
    return (
      <Reveal index={index} className="theme-product-card group cursor-pointer overflow-hidden theme-rounded" onClick={() => openDetail("categories")}>
        <div className="flex gap-3 p-3">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]">
            <ProgressiveImage src={product.cover_image} blurDataUrl={PRODUCT_BLUR_PLACEHOLDER} alt={product.name} className="h-full w-full bg-transparent" imgClassName="h-full w-full [object-fit:var(--theme-image-fit,cover)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold text-[var(--theme-text)]">{product.name}</h3>
            <p className="mt-1 text-xs text-[var(--theme-text-muted)]">库存 {Math.max(0, displayStock)} · 销量 {formatSales(Math.max(0, Number(product.sales_count) || 0))}</p>
            <div className="mt-3 flex items-center justify-between">
              <StorePrice price={product.price} size="sm" />
              <div className="flex items-center gap-1">
                <button type="button" onClick={onToggleFavorite} onPointerUp={(e) => e.stopPropagation()} className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[11px]">{isFavorite ? "♥ 已收藏" : "♡ 收藏"}</button>
                <SquishButton type="button" variant="solid" aria-label={soldOut ? "已售罄" : "加入购物车"} onClick={onAddToCart} disabled={soldOut} className="flex h-8 w-8 items-center justify-center rounded-full !p-0 disabled:opacity-50"><ShoppingCart size={14} /></SquishButton>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    );
  }

  const isPremium = cardVariant === "premium";

  return (
    <Reveal index={index} className="theme-product-card group cursor-pointer overflow-hidden theme-rounded" onClick={() => openDetail("product_grid")}>
      <div className="relative overflow-hidden bg-[var(--theme-bg)]" style={{ aspectRatio: isPremium ? "1 / 1" : "var(--theme-image-ratio)" }}>
        <ProgressiveImage src={product.cover_image} blurDataUrl={PRODUCT_BLUR_PLACEHOLDER} alt={product.name} className="h-full w-full bg-transparent" imgClassName="h-full w-full transition-all duration-300 ease-in-out group-hover:scale-105 [object-fit:var(--theme-image-fit,cover)]" />
        <div className="absolute left-2 top-2 flex gap-1">
          {product.active_activity && <StoreBadge type="sale">{product.active_activity.type === "flash_sale" ? "秒杀" : "满减"}</StoreBadge>}
          {product.is_hot && <StoreBadge type="hot">热销</StoreBadge>}
          {product.is_new && <StoreBadge type="new">新品</StoreBadge>}
          <ProductTagList tags={product.tags} max={2} />
        </div>
      </div>
      <div className={`flex flex-col gap-2 p-3 ${isPremium ? "gap-2.5 p-3.5" : ""} ${cardCenter ? "items-center text-center" : ""}`}>
        <h3 className="line-clamp-2 text-[13px] font-medium leading-tight text-[var(--theme-text)]">{product.name}</h3>
        <div className={`flex gap-2 ${cardCenter ? "w-full items-center justify-center" : "items-end justify-between"}`}>
          <div className={`min-w-0 ${cardCenter ? "flex flex-col items-center" : "flex-1"}`}>
            <StorePrice price={product.price} originalPrice={product.original_price} size={cardVariant === "deal" ? "lg" : isPremium ? "lg" : "md"} className={cardCenter ? "justify-center" : ""} />
            <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--theme-text-muted)] ${cardCenter ? "justify-center" : ""}`}>
              <span>+{product.points} 积分</span>
              {typeof product.sales_count === "number" && product.sales_count > 0 && <span>已售 {formatSales(product.sales_count)}</span>}
            </div>
          </div>
          <StoreButton aria-label={soldOut ? "已售罄" : "加入购物车"} onClick={onAddToCart} disabled={soldOut} size="sm" variant={cardVariant === "deal" ? "price" : "primary"} className="h-9 w-9 !p-0 disabled:opacity-50"><ShoppingCart size={15} /></StoreButton>
        </div>
        <button type="button" onClick={onToggleFavorite} onPointerUp={(e) => e.stopPropagation()} className="self-end text-[11px] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]">{isFavorite ? "♥ 已收藏" : "♡ 收藏"}</button>
        {soldOut ? <span className="self-end text-[11px] text-[var(--theme-text-muted)]">已售罄</span> : null}
      </div>
    </Reveal>
  );
}
