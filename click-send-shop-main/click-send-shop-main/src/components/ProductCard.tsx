import { Heart, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import type { Product } from "@/types/product";
import { toast } from "sonner";
import Reveal from "@/components/Reveal";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import {
  ProgressiveImage,
  SquishButton,
} from "@/modules/micro-interactions";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

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

  return (
    <Reveal
      index={index}
      className="theme-product-card group cursor-pointer overflow-hidden theme-rounded"
    >
      <div
        className="relative overflow-hidden bg-[var(--theme-bg)]"
        style={{ aspectRatio: "var(--theme-image-ratio)" }}
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
          {product.is_hot && (
            <span className="theme-rounded bg-[var(--theme-price)] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-price-foreground)] theme-shadow">
              热销
            </span>
          )}
          {product.is_new && (
            <span className="theme-rounded bg-[var(--theme-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-primary-foreground)] theme-shadow">
              新品
            </span>
          )}
        </div>

        {/* Favorite button */}
        <SquishButton
          type="button"
          aria-label={isFavorite ? "取消收藏" : "收藏"}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
            toast.success(isFavorite ? "已取消收藏" : "已收藏");
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 backdrop-blur-sm transition-all active:scale-90 shadow-none !p-0"
        >
          <Heart
            size={16}
            className={isFavorite ? "fill-[var(--theme-price)] text-[var(--theme-price)]" : "text-[var(--theme-text)]"}
          />
        </SquishButton>
      </div>
      <div className={`flex flex-col gap-2 p-3 ${cardCenter ? "items-center text-center" : ""}`}>
        <h3
          className="line-clamp-2 text-[13px] font-medium leading-tight text-[var(--theme-text)]"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          {product.name}
        </h3>
        <div className={`flex items-end gap-2 ${cardCenter ? "w-full justify-center" : "justify-between"}`}>
          <div className={`min-w-0 ${cardCenter ? "flex flex-col items-center" : "flex-1"}`}>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold leading-none text-[var(--theme-price)]">
                RM {product.price}
              </span>
              {typeof product.original_price === "number"
                && product.original_price > product.price && (
                  <span className="text-[11px] text-[var(--theme-text-muted)] line-through">
                    RM {product.original_price}
                  </span>
                )}
            </div>
            <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--theme-text-muted)] ${cardCenter ? "justify-center" : ""}`}>
              <span>+{product.points}积分</span>
              {typeof product.sales_count === "number" && product.sales_count > 0 && (
                <span>已售 {formatSales(product.sales_count)}</span>
              )}
            </div>
          </div>
          <SquishButton
            type="button"
            aria-label="加入购物车"
            onClick={(e) => {
              e.stopPropagation();
              addItem(product);
              toast.success("已加入购物车");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] transition-all active:scale-90 touch-target hover:opacity-90 shadow-none !p-0"
          >
            <ShoppingCart size={15} />
          </SquishButton>
        </div>
      </div>
    </Reveal>
  );
}
