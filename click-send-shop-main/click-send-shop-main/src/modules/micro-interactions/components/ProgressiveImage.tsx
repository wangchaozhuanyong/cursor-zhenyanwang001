import { cn } from "@/lib/utils";
import { hasLoadedImage, markImageLoaded, rememberLoadedImageFromElement } from "@/utils/imageLoadMemory";
import { toFullUploadImageUrl } from "@/utils/uploadImageVariant";
import { ImageOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fallbackSources = useMemo(() => {
    const full = toFullUploadImageUrl(src);
    return [fallbackSrc, full !== src ? full : undefined]
      .filter((item): item is string => !!item && item !== src);
  }, [fallbackSrc, src]);
  const [hiResLoaded, setHiResLoaded] = useState(() => hasLoadedImage(src, fallbackSrc, ...fallbackSources));
  const [loadFailed, setLoadFailed] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const activeSrc = sourceIndex === 0 ? src : fallbackSources[sourceIndex - 1] || "";

  useEffect(() => {
    setSourceIndex(0);
    setHiResLoaded(hasLoadedImage(src, fallbackSrc, ...fallbackSources));
    setLoadFailed(false);
  }, [fallbackSrc, fallbackSources, src]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const markLoadedIfReady = () => {
      if (rememberLoadedImageFromElement(img, src, activeSrc, fallbackSrc, ...fallbackSources)) {
        setHiResLoaded(true);
        setLoadFailed(false);
      }
    };

    markLoadedIfReady();
    const frame = window.requestAnimationFrame(markLoadedIfReady);
    const timer = window.setTimeout(markLoadedIfReady, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [activeSrc, fallbackSrc, fallbackSources, src]);

  const showHiRes = hiResLoaded && !loadFailed;
  const showLoadingPlate = !showHiRes && !loadFailed;
  const showFailurePlate = loadFailed && !showHiRes;
  const fetchPriorityProps = fetchPriority
    ? ({ fetchpriority: fetchPriority } as Record<string, string>)
    : {};

  return (
    <div className={cn("relative overflow-hidden bg-[var(--theme-bg)]", className)}>
      {withBlurPlaceholder ? (
        <img
          src={blurDataUrl}
          alt={`${alt} 模糊占位图`}
          aria-hidden
          draggable={false}
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl transition-opacity duration-300",
            showHiRes ? "opacity-0" : "opacity-100",
            imgClassName,
          )}
        />
      ) : null}

      {showLoadingPlate ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--theme-border)_34%,var(--theme-bg))]",
            imgClassName,
          )}
          aria-hidden
        />
      ) : null}

      {showFailurePlate ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--theme-border)_28%,var(--theme-bg))] text-[var(--theme-text-muted)]",
            imgClassName,
          )}
          aria-hidden
        >
          <ImageOff size={28} strokeWidth={1.5} className="opacity-45" />
        </div>
      ) : null}

      {activeSrc ? (
        <img
          key={activeSrc}
          ref={imgRef}
          src={activeSrc}
          alt={alt}
          sizes={sizes}
          loading={loading}
          decoding="async"
          {...fetchPriorityProps}
          draggable={false}
          onLoad={(event) => {
            markImageLoaded(src, activeSrc, fallbackSrc, ...fallbackSources, event.currentTarget.currentSrc, event.currentTarget.src);
            setHiResLoaded(true);
            setLoadFailed(false);
          }}
          onError={() => {
            const nextIndex = sourceIndex + 1;
            if (nextIndex <= fallbackSources.length) {
              const nextSource = fallbackSources[nextIndex - 1];
              setSourceIndex(nextIndex);
              setHiResLoaded(hasLoadedImage(nextSource));
              setLoadFailed(false);
              return;
            }
            setLoadFailed(true);
            setHiResLoaded(false);
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out",
            showHiRes ? "scale-100 opacity-100" : "scale-[1.015] opacity-0",
            imgClassName,
          )}
        />
      ) : null}
    </div>
  );
}
