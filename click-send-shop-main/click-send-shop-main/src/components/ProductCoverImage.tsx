import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { ProgressiveImage } from "@/modules/micro-interactions/components/ProgressiveImage";
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
function fallbackInitials(alt: string) {
  const chars = Array.from(String(alt || ""))
    .map((ch) => ch.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return chars || "DM";
}

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
    const initials = fallbackInitials(alt);
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-[var(--store-product-media-bg)] text-[color-mix(in_srgb,var(--theme-primary)_72%,var(--theme-text-on-surface))]",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 28% 18%, color-mix(in srgb, var(--theme-primary) 20%, transparent), transparent 34%), radial-gradient(circle at 78% 82%, color-mix(in srgb, var(--theme-accent) 16%, transparent), transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.96), color-mix(in srgb, var(--theme-surface) 86%, white))",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-x-5 top-1/2 h-px bg-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)]"
          aria-hidden
        />
        <span className="relative z-[1] inline-flex aspect-square h-[min(3.5rem,62%)] min-h-8 min-w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_22%,white)] bg-white/74 px-2 text-lg font-bold shadow-[0_16px_38px_rgba(120,72,38,0.12)] backdrop-blur-sm sm:text-2xl">
          {initials}
        </span>
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
