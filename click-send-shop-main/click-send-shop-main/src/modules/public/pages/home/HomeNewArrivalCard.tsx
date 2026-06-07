import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import ProductCoverImage from "@/components/ProductCoverImage";
import { resolveNewArrivalImage } from "./newArrivalOps";
import StoreBadge from "@/components/ui/StoreBadge";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import { observeHomeCardImpression } from "./homeCardImpressionObserver";
import {
  HOME_NEW_ARRIVAL_CARD_WIDTH_CLASS,
  HOME_PRODUCT_BADGE_CLASS,
  HOME_PRODUCT_CARD_MEDIA,
  HOME_PRODUCT_CARD_SHELL,
  HOME_PRODUCT_IMAGE_IMG_CLASS,
  HOME_PRODUCT_IMAGE_PRODUCT_CLASS,
  HOME_PRODUCT_INFO_CLASS,
  HOME_PRODUCT_PRICE_AMOUNT_CLASS,
  HOME_PRODUCT_PRICE_CURRENCY_CLASS,
  HOME_PRODUCT_TITLE_CLASS,
} from "@/constants/homeProductCard";
import { cn } from "@/lib/utils";

interface HomeNewArrivalCardProps {
  product: Product;
  index: number;
  showPrice?: boolean;
  onClick?: (product: Product, index: number) => void;
  registerImpression?: (product: Product, index: number) => void;
}

export default function HomeNewArrivalCard({
  product,
  index,
  showPrice = true,
  onClick,
  registerImpression,
}: HomeNewArrivalCardProps) {
  const imageUrl = resolveNewArrivalImage(product, index);
  const shouldEagerLoadImage = index === 0;
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!cardRef.current || !registerImpression) return;
    const node = cardRef.current;
    return observeHomeCardImpression(node, () => registerImpression(product, index));
  }, [index, product, registerImpression]);

  return (
    <Link
      ref={cardRef}
      to={`/product/${product.id}`}
      onClick={() => onClick?.(product, index)}
      className={cn(HOME_PRODUCT_CARD_SHELL, HOME_NEW_ARRIVAL_CARD_WIDTH_CLASS)}
      aria-label={`查看 ${product.name}`}
    >
      <div className={cn(HOME_PRODUCT_CARD_MEDIA, HOME_PRODUCT_IMAGE_PRODUCT_CLASS)}>
        <ProductCoverImage
          url={imageUrl || undefined}
          alt={`${product.name} 商品图片`}
          className="h-full w-full"
          imgClassName={HOME_PRODUCT_IMAGE_IMG_CLASS}
          sizes="(max-width: 768px) 28vw, 128px"
          loading={shouldEagerLoadImage ? "eager" : "lazy"}
          fetchPriority={shouldEagerLoadImage ? "low" : undefined}
        />
        <StoreBadge type="new" onMedia className={cn(HOME_PRODUCT_BADGE_CLASS, "absolute left-1.5 top-1.5")}>
          新品
        </StoreBadge>
      </div>
      <div className={HOME_PRODUCT_INFO_CLASS}>
        <p className={HOME_PRODUCT_TITLE_CLASS}>{product.name}</p>
        {showPrice ? (
          <div className="mt-1.5">
            <StorePriceAmount
              amount={product.price}
              amountClassName={HOME_PRODUCT_PRICE_AMOUNT_CLASS}
              currencyClassName={HOME_PRODUCT_PRICE_CURRENCY_CLASS}
            />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
