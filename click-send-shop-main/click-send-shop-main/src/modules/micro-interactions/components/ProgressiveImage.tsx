import StableImage from "@/components/ui/StableImage";
import { toFullUploadImageUrl } from "@/utils/uploadImageVariant";
import { useMemo } from "react";

export type ProgressiveImageProps = {
  src: string;
  blurDataUrl: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Optional sizes / fetchPriority passthrough for the hi-res image */
  sizes?: string;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
  /** 主图 404 时回退（如仅有 full、无 -card/-detail 的历史上传） */
  fallbackSrc?: string;
  /** 是否渲染 LQIP 模糊垫底（列表靠后项可关闭以减轻合成压力） */
  withBlurPlaceholder?: boolean;
};

/**
 * Blur-up reveal: LQIP 垫底，高清图加载完成后淡入；失败时回退 full 或保持可见占位。
 */
export function ProgressiveImage({
  src,
  blurDataUrl,
  alt,
  className,
  imgClassName,
  sizes,
  fetchPriority,
  loading = "lazy",
  fallbackSrc,
  withBlurPlaceholder = true,
}: ProgressiveImageProps) {
  const fallbackSources = useMemo(() => {
    const full = toFullUploadImageUrl(src);
    return [fallbackSrc, full !== src ? full : undefined]
      .filter((item): item is string => !!item && item !== src);
  }, [fallbackSrc, src]);

  return (
    <StableImage
      src={src}
      fallbackSrc={fallbackSources[0]}
      blurDataUrl={withBlurPlaceholder ? blurDataUrl : null}
      alt={alt}
      className={className}
      imgClassName={imgClassName}
      sizes={sizes}
      fetchPriority={fetchPriority}
      loading={loading}
      withPlaceholder={withBlurPlaceholder}
    />
  );
}
