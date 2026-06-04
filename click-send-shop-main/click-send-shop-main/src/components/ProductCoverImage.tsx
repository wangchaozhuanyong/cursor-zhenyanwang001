import { ImageOff } from "lucide-react";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { ProgressiveImage } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";
import { resolveProductImageSrc, type UploadImageVariant } from "@/utils/uploadImageVariant";

type ProductCoverImageProps = {
  url: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
  variant?: UploadImageVariant;
  withBlurPlaceholder?: boolean;
};

/** 商品封面：统一 URL 归一化、card→full 回退，避免列表/购物车白块 */
export default function ProductCoverImage({
  url,
  alt,
  className,
  imgClassName,
  sizes,
  fetchPriority,
  loading,
  variant = "card",
  withBlurPlaceholder = true,
}: ProductCoverImageProps) {
  const { src, fallbackSrc } = resolveProductImageSrc(url, variant);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[var(--store-product-media-bg)] text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]",
          className,
        )}
        aria-hidden
      >
        <ImageOff size={28} strokeWidth={1.5} className="opacity-40" />
      </div>
    );
  }

  return (
    <ProgressiveImage
      src={src}
      fallbackSrc={fallbackSrc}
      blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
      alt={alt}
      className={className}
      imgClassName={imgClassName}
      sizes={sizes}
      fetchPriority={fetchPriority}
      loading={loading}
      withBlurPlaceholder={withBlurPlaceholder}
    />
  );
}
