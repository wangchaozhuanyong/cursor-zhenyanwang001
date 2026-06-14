import RatioImage, { type ClientImageRatio } from "@/components/client/RatioImage";
import { resolveProductImageSrc, type UploadImageVariant } from "@/utils/uploadImageVariant";

type ProductCoverImageProps = {
  url: string | null | undefined;
  alt: string;
  ratio?: ClientImageRatio;
  fit?: "cover" | "contain";
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
  ratio = "1 / 2",
  fit = "cover",
  className,
  imgClassName,
  sizes,
  fetchPriority,
  loading,
  variant = "card",
  withBlurPlaceholder = true,
}: ProductCoverImageProps) {
  const { src, fallbackSrc } = resolveProductImageSrc(url, variant);

  return (
    <RatioImage
      src={src}
      fallbackSrc={fallbackSrc}
      alt={alt}
      ratio={ratio}
      fit={fit}
      rounded="none"
      className={className}
      imgClassName={imgClassName}
      sizes={sizes}
      fetchPriority={fetchPriority}
      loading={loading}
      placeholderClassName={withBlurPlaceholder ? undefined : "bg-[var(--store-product-media-bg)]"}
    />
  );
}
