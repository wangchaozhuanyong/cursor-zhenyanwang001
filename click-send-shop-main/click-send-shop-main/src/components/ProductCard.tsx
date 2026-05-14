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

interface Props {
  product: Product;
  index?: number;
}

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

  const onAddToCart = (event?: MouseEvent) => {
    event?.stopPropagation();
    addItem(product);
    trackAddToCart(product, 1);
    toast.success("已加入购物车", toastPresetQuickSuccess);
  };

  if (cardVariant === "compact") {
    return (
      <Reveal
        index={index}
        className="theme-product-card group cursor-pointer overflow-hidden theme-rounded"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <div className="flex gap-3 p-3">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]">
            <ProgressiveImage
              src={product.cover_image}
              blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
              alt={product.name}
              className="h-full w-full bg-transparent"
              imgClassName="h-full w-full [object-fit:var(--theme-image-fit,cover)]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold text-[var(--theme-text)]">{product.name}</h3>
            <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
              库存 {Math.max(0, Number(product.stock) || 0)} · 销量 {formatSales(Math.max(0, Number(product.sales_count) || 0))}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <StorePrice price={product.price} size="sm" />
              <SquishButton type="button" variant="solid" aria-label="加入购物车" onClick={onAddToCart} className="flex h-8 w-8 items-center justify-center rounded-full !p-0">
                <ShoppingCart size={14} />
              </SquishButton>
            </div>
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
    >
      <div
        className="relative overflow-hidden bg-[var(--theme-bg)]"
        style={{ aspectRatio: isPremium ? "1 / 1" : "var(--theme-image-ratio)" }}
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <ProgressiveImage
          src={product.cover_image}
          blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
          alt={product.name}
          className="h-full w-full bg-transparent"
          imgClassName="h-full w-full transition-all duration-300 ease-in-out group-hover:scale-105 [object-fit:var(--theme-image-fit,cover)]"
        />
        <div className="absolute left-2 top-2 flex gap-1">
          {product.active_activity && <StoreBadge type="sale">{product.active_activity.type === "flash_sale" ? "秒杀" : "满减"}</StoreBadge>}
          {product.is_hot && <StoreBadge type="hot">热销</StoreBadge>}
          {product.is_new && <StoreBadge type="new">新品</StoreBadge>}
          <ProductTagList tags={product.tags} max={2} />
        </div>

        <SquishButton
          type="button"
          variant="ghost"
          aria-label={isFavorite ? "取消收藏" : "收藏"}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product);
            toast.success(isFavorite ? "已取消收藏" : "已收藏", toastPresetQuickSuccess);
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 backdrop-blur-sm transition-all active:scale-90 !p-0"
        >
          <Heart
            size={16}
            className={isFavorite ? "fill-[var(--theme-price)] text-[var(--theme-price)]" : "text-[var(--theme-text)]"}
          />
        </SquishButton>
      </div>
      <div className={`flex flex-col gap-2 p-3 ${isPremium ? "gap-2.5 p-3.5" : ""} ${cardCenter ? "items-center text-center" : ""}`}>
        <h3
          className="line-clamp-2 text-[13px] font-medium leading-tight text-[var(--theme-text)]"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          {product.name}
        </h3>
        <div
          className={`flex gap-2 ${cardCenter ? "w-full items-center justify-center" : "items-end justify-between"}`}
        >
          <div className={`min-w-0 ${cardCenter ? "flex flex-col items-center" : "flex-1"}`}>
            <StorePrice
              price={product.price}
              originalPrice={product.original_price}
              size={cardVariant === "deal" ? "lg" : isPremium ? "lg" : "md"}
              className={cardCenter ? "justify-center" : ""}
            />
            {product.active_activity && (
              <div className={`mt-1 text-[10px] font-semibold text-[var(--theme-danger)] ${cardCenter ? "text-center" : ""}`}>
                {product.active_activity.title}
                {product.active_activity.type === "full_reduction" && product.activity_promo_label ? (
                  <span className="ml-1 opacity-90">· {product.activity_promo_label}</span>
                ) : null}
              </div>
            )}
            <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--theme-text-muted)] ${cardCenter ? "justify-center" : ""}`}>
              <span>+{product.points} 积分</span>
              {typeof product.sales_count === "number" && product.sales_count > 0 && (
                <span>已售 {formatSales(product.sales_count)}</span>
              )}
            </div>
          </div>
          <StoreButton
            aria-label="加入购物车"
            onClick={onAddToCart}
            size="sm"
            variant={cardVariant === "deal" ? "price" : "primary"}
            className="h-9 w-9 !p-0"
          >
            <ShoppingCart size={15} />
          </StoreButton>
        </div>
      </div>
    </Reveal>
  );
}
