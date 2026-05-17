import { cn } from "@/lib/utils";
import { toFullUploadImageUrl } from "@/utils/uploadImageVariant";
import { useEffect, useState } from "react";

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
}: ProgressiveImageProps) {
  const [hiResLoaded, setHiResLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);
  const resolvedFallback =
    fallbackSrc ?? (toFullUploadImageUrl(src) !== src ? toFullUploadImageUrl(src) : undefined);

  useEffect(() => {
    setActiveSrc(src);
    setHiResLoaded(false);
    setLoadFailed(false);
  }, [src]);

  const showHiRes = hiResLoaded && !loadFailed;
  const showLoadingPlate = !showHiRes && !loadFailed;

  return (
    <div className={cn("relative overflow-hidden bg-[var(--theme-bg)]", className)}>
      <img
        src={blurDataUrl}
        alt=""
        aria-hidden
        draggable={false}
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl transition-opacity duration-300",
          showHiRes ? "opacity-0" : "opacity-100",
          imgClassName,
        )}
      />

      {showLoadingPlate ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 animate-pulse bg-[color-mix(in_srgb,var(--theme-border)_55%,var(--theme-bg))]",
            imgClassName,
          )}
          aria-hidden
        />
      ) : null}

      {activeSrc ? (
        <img
          key={activeSrc}
          src={activeSrc}
          alt={alt}
          sizes={sizes}
          loading={loading}
          decoding="async"
          {...(fetchPriority ? { fetchPriority } : {})}
          draggable={false}
          onLoad={() => {
            setHiResLoaded(true);
            setLoadFailed(false);
          }}
          onError={() => {
            if (resolvedFallback && activeSrc !== resolvedFallback) {
              setActiveSrc(resolvedFallback);
              setHiResLoaded(false);
              setLoadFailed(false);
              return;
            }
            setLoadFailed(true);
            setHiResLoaded(false);
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity ease-out duration-300",
            showHiRes ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      ) : null}
    </div>
  );
}
