import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { ProgressiveImage } from "@/modules/micro-interactions";
import { resolveProductImageSrc } from "@/utils/uploadImageVariant";
import { resolveNewArrivalImage } from "./newArrivalOps";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import {
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
  const image = resolveNewArrivalImage(product, index);
  const { src: imageSrc, fallbackSrc } = resolveProductImageSrc(image, "card");
  const cardRef = useRef<HTMLAnchorElement | null>(null);

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
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [index, product, registerImpression]);

  return (
    <Link
      ref={cardRef}
      to={`/product/${product.id}`}
      onClick={() => onClick?.(product, index)}
      className={cn(
        HOME_PRODUCT_CARD_SHELL,
        "w-[132px] shrink-0 snap-start",
      )}
      aria-label={`查看 ${product.name}`}
    >
      <div className={cn(HOME_PRODUCT_CARD_MEDIA, HOME_PRODUCT_IMAGE_PRODUCT_CLASS)}>
        {imageSrc ? (
          <ProgressiveImage
            src={imageSrc}
            fallbackSrc={fallbackSrc}
            blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
            alt={product.name}
            className="h-full w-full"
            imgClassName={HOME_PRODUCT_IMAGE_IMG_CLASS}
          />
        ) : null}
        <span
          className={cn(
            HOME_PRODUCT_BADGE_CLASS,
            "absolute left-1.5 top-1.5 border-transparent bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]",
          )}
        >
          新品
        </span>
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
