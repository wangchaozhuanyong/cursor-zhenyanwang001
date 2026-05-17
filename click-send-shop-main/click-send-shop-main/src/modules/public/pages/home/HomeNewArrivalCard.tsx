import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { ProgressiveImage } from "@/modules/micro-interactions";
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
      className="w-[132px] shrink-0 snap-start overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]"
      aria-label={`查看 ${product.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--theme-surface)]">
        {image ? (
          <ProgressiveImage
            src={image}
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
      <div className="px-2 py-2">
        <p className="line-clamp-1 text-xs font-semibold text-[var(--theme-text-on-surface)]">{product.name}</p>
        {showPrice ? <p className="mt-1 text-sm font-bold text-[var(--theme-price)]">RM {product.price}</p> : null}
      </div>
    </Link>
  );
}
