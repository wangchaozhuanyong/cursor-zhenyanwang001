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
  /** 主图 404 时回退（如仅有 full、无 -card/-detail 的历史上传） */
  fallbackSrc?: string;
};

/**
 * Blur-up “focus” reveal: tiny LQIP first, hi-res fades in with a 400ms opacity transition.
 */
export function ProgressiveImage({
  src,
  blurDataUrl,
  alt,
  className,
  imgClassName,
  sizes,
  fetchPriority,
  fallbackSrc,
}: ProgressiveImageProps) {
  const [hiResLoaded, setHiResLoaded] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);
  const resolvedFallback = fallbackSrc ?? (toFullUploadImageUrl(src) !== src ? toFullUploadImageUrl(src) : undefined);

  useEffect(() => {
    setActiveSrc(src);
    setHiResLoaded(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-[var(--theme-surface)]", className)}>
      {/* Blur plate (decorative) */}
      <img
        src={blurDataUrl}
        alt=""
        aria-hidden
        draggable={false}
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl",
          imgClassName,
        )}
      />

      {/* Hi-res layer */}
      <img
        src={activeSrc}
        alt={alt}
        sizes={sizes}
        {...(fetchPriority ? { fetchPriority } : {})}
        draggable={false}
        onLoad={() => setHiResLoaded(true)}
        onError={() => {
          if (resolvedFallback && activeSrc !== resolvedFallback) {
            setActiveSrc(resolvedFallback);
            setHiResLoaded(false);
          }
        }}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity ease-out duration-300",
          hiResLoaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </div>
  );
}
