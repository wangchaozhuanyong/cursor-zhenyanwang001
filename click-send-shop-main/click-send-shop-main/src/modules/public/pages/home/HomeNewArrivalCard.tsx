import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { ProgressiveImage } from "@/modules/micro-interactions";
import { resolveProductImageSrc } from "@/utils/uploadImageVariant";
import { resolveNewArrivalImage } from "./newArrivalOps";

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
      className="theme-rounded w-[132px] shrink-0 snap-start overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-bg)] p-1.5"
      aria-label={`查看 ${product.name}`}
    >
      <div className="theme-rounded relative aspect-square w-full overflow-hidden bg-[var(--theme-surface)]">
        {imageSrc ? (
          <ProgressiveImage
            src={imageSrc}
            fallbackSrc={fallbackSrc}
            blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
            alt={product.name}
            className="h-full w-full"
            imgClassName="h-full w-full object-cover"
          />
        ) : null}
        <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--theme-primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--theme-primary-foreground)]">
          新品
        </span>
      </div>
      <div className="px-0.5 pb-1 pt-2">
        <p className="line-clamp-1 text-xs font-semibold text-[var(--theme-text-on-surface)]">{product.name}</p>
        {showPrice ? (
          <p className="mt-1 whitespace-nowrap text-xs font-bold text-[var(--theme-price)]">
            RM&nbsp;{product.price}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
