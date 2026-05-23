import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import ProductCoverImage from "@/components/ProductCoverImage";
import StoreBadge from "@/components/ui/StoreBadge";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import { trackEvent } from "@/services/analyticsService";
import { cn } from "@/lib/utils";
import { isProductNewArrival } from "@/utils/productNewArrival";
import {
  HOME_PRODUCT_BADGE_CLASS,
  HOME_PRODUCT_CARD_MEDIA,
  HOME_PRODUCT_CARD_SHELL,
  HOME_PRODUCT_IMAGE_IMG_CLASS,
  HOME_PRODUCT_INFO_CLASS,
  HOME_PRODUCT_PRICE_AMOUNT_CLASS,
  HOME_PRODUCT_PRICE_CURRENCY_CLASS,
  HOME_PRODUCT_TITLE_CLASS,
  homeProductImageAspectClass,
  isHomeServiceLikeProduct,
} from "@/constants/homeProductCard";

interface HomeGridProductCardProps {
  product: Product;
  index: number;
  showPrice?: boolean;
  registerImpression?: (product: Product, index: number) => void;
}

export default function HomeGridProductCard({
  product,
  index,
  showPrice = true,
  registerImpression,
}: HomeGridProductCardProps) {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const defaultVariant = product.default_variant ?? (product.variants?.length === 1 ? product.variants[0] : null);
  const displayStock = Number(defaultVariant?.stock ?? product.stock ?? 0);
  const soldOut = displayStock <= 0;
  const showNewBadge = isProductNewArrival(product);
  const isServiceLike = isHomeServiceLikeProduct(product);
  const cardImageAlt = isServiceLike ? `${product.name} 服务展示图` : `${product.name} 商品图片`;
  const imageLoading = index < 4 ? "eager" : "lazy";
  const imageFetchPriority = index < 2 ? "high" : undefined;
  const priceNum = Number(product.price || 0);
  const formatMoney = (v: number) => v.toFixed(2).replace(/\.00$/, "");

  useEffect(() => {
    if (!cardRef.current || !registerImpression) return;
    const node = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            registerImpression(product, index);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.45 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [index, product, registerImpression]);

  const hasBadges =
    Boolean(product.active_activity) || Boolean(product.is_hot) || showNewBadge;

  return (
    <Link
      ref={cardRef}
      to={`/product/${product.id}`}
      onClick={() => {
        void trackEvent({ event_type: "product_click", module: "hot_sales", product_id: product.id });
      }}
      className={cn(HOME_PRODUCT_CARD_SHELL, "group min-w-0 transform-gpu")}
      aria-label={`查看 ${product.name}`}
    >
      <div className={cn(HOME_PRODUCT_CARD_MEDIA, homeProductImageAspectClass(product))}>
        <ProductCoverImage
          url={product.cover_image}
          alt={cardImageAlt}
          className="h-full w-full"
          imgClassName={cn(
            HOME_PRODUCT_IMAGE_IMG_CLASS,
            "transition-transform duration-300 ease-out group-hover:scale-[1.02]",
            soldOut && "grayscale-[35%] brightness-[0.88] saturate-[0.85]",
            isServiceLike && "object-[center_22%]",
          )}
          sizes="(max-width: 768px) 45vw, 240px"
          loading={imageLoading}
          fetchPriority={imageFetchPriority}
        />
        {hasBadges ? (
          <div className="pointer-events-none absolute left-1.5 top-1.5 z-[1] flex max-w-[calc(100%-0.75rem)] flex-wrap gap-1">
            {product.active_activity ? (
              <StoreBadge type="sale" onMedia className={HOME_PRODUCT_BADGE_CLASS}>
                {product.active_activity.type === "flash_sale" ? "秒杀" : "满减"}
              </StoreBadge>
            ) : null}
            {product.is_hot ? (
              <StoreBadge type="hot" onMedia className={HOME_PRODUCT_BADGE_CLASS}>
                热销
              </StoreBadge>
            ) : null}
            {showNewBadge ? (
              <StoreBadge type="new" onMedia className={HOME_PRODUCT_BADGE_CLASS}>
                新品
              </StoreBadge>
            ) : null}
          </div>
        ) : null}
        {soldOut ? (
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/35">
            <span className="rounded-full border border-white/30 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
              已售罄
            </span>
          </div>
        ) : null}
      </div>
      <div className={HOME_PRODUCT_INFO_CLASS}>
        <p className={HOME_PRODUCT_TITLE_CLASS}>{product.name}</p>
        {showPrice ? (
          <div className="mt-1.5">
            <StorePriceAmount
              amount={formatMoney(priceNum)}
              amountClassName={HOME_PRODUCT_PRICE_AMOUNT_CLASS}
              currencyClassName={HOME_PRODUCT_PRICE_CURRENCY_CLASS}
            />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
