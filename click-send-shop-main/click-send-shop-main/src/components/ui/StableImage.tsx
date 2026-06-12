import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  hasImageLoaded,
  markImageLoaded,
  preloadImage,
} from "@/lib/media/imageLoadCache";
import {
  resolveStableImageUrl,
  type StableImageSource,
  type StableImageVariant,
} from "@/lib/media/resolveStableImageUrl";

type StableImageProps = {
  source?: StableImageSource | string | null;
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  variant?: StableImageVariant;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
  blurDataUrl?: string | null;
  dominantColor?: string | null;
  sizes?: string;
  objectFit?: CSSProperties["objectFit"];
  withPlaceholder?: boolean;
  fallbackLabel?: string;
  ariaHidden?: boolean;
  onError?: () => void;
};

export function StableImage({
  source,
  src,
  fallbackSrc,
  alt,
  width,
  height,
  aspectRatio,
  variant = "original",
  loading = "lazy",
  fetchPriority = "auto",
  className,
  imgClassName,
  placeholderClassName,
  blurDataUrl,
  dominantColor,
  sizes,
  objectFit,
  withPlaceholder = true,
  fallbackLabel = "图片暂不可用",
  ariaHidden = false,
  onError,
}: StableImageProps) {
  const resolvedSrc = useMemo(() => {
    return String(src || resolveStableImageUrl(source, variant) || "").trim();
  }, [source, src, variant]);
  const fallback = String(fallbackSrc || "").trim();
  const lastGoodSrcRef = useRef("");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const onErrorRef = useRef(onError);
  const [displaySrc, setDisplaySrc] = useState(() => resolvedSrc || fallback);
  const [isLoaded, setIsLoaded] = useState(() => hasImageLoaded(resolvedSrc) || hasImageLoaded(fallback));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    const nextSrc = resolvedSrc || fallback;

    if (!nextSrc) {
      lastGoodSrcRef.current = "";
      setDisplaySrc("");
      setIsLoaded(false);
      setHasError(false);
      return;
    }

    setHasError(false);

    if (hasImageLoaded(nextSrc)) {
      lastGoodSrcRef.current = nextSrc;
      setDisplaySrc(nextSrc);
      setIsLoaded(true);
      return;
    }

    if (!lastGoodSrcRef.current && displaySrc) {
      lastGoodSrcRef.current = displaySrc;
    }

    preloadImage(nextSrc)
      .then(() => {
        if (cancelled) return;
        markImageLoaded(nextSrc);
        lastGoodSrcRef.current = nextSrc;
        setDisplaySrc(nextSrc);
        setIsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (fallback && fallback !== nextSrc) {
          void preloadImage(fallback)
            .then(() => {
              if (cancelled) return;
              markImageLoaded(fallback);
              lastGoodSrcRef.current = fallback;
              setDisplaySrc(fallback);
              setIsLoaded(true);
              setHasError(false);
            })
            .catch(() => {
              if (cancelled) return;
              setHasError(true);
              setIsLoaded(Boolean(lastGoodSrcRef.current));
              onErrorRef.current?.();
            });
          return;
        }
        setHasError(true);
        setIsLoaded(Boolean(lastGoodSrcRef.current));
        onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
    };
  }, [displaySrc, fallback, resolvedSrc]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !displaySrc) return;
    if (!img.complete || img.naturalWidth <= 0) return;
    markImageLoaded(displaySrc);
    lastGoodSrcRef.current = displaySrc;
    setIsLoaded(true);
    setHasError(false);
  }, [displaySrc]);

  const ratio = aspectRatio || (width && height ? `${width} / ${height}` : undefined);
  const placeholderStyle: CSSProperties = {
    backgroundColor: dominantColor || undefined,
    backgroundImage: blurDataUrl ? `url(${blurDataUrl})` : undefined,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
  const rootStyle: CSSProperties = {
    aspectRatio: ratio,
  };
  const imageStyle: CSSProperties | undefined = objectFit ? { objectFit } : undefined;
  const fetchPriorityProps = fetchPriority
    ? ({ fetchpriority: fetchPriority } as Record<string, string>)
    : {};

  return (
    <div
      className={cn("relative overflow-hidden bg-[var(--theme-bg)]", className)}
      style={rootStyle}
      role={!displaySrc || hasError ? "img" : undefined}
      aria-label={!displaySrc || hasError ? alt : undefined}
      aria-hidden={ariaHidden || undefined}
    >
      {withPlaceholder ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--theme-border)_34%,var(--theme-bg))] transition-opacity duration-200",
            isLoaded && displaySrc && !hasError ? "opacity-0" : "opacity-100",
            placeholderClassName,
          )}
          style={placeholderStyle}
          aria-hidden
        />
      ) : null}

      {displaySrc && !hasError ? (
        <img
          ref={imgRef}
          src={displaySrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={loading}
          decoding="async"
          draggable={false}
          {...fetchPriorityProps}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
            isLoaded ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
          style={imageStyle}
          onLoad={(event) => {
            markImageLoaded(displaySrc);
            markImageLoaded(event.currentTarget.currentSrc);
            lastGoodSrcRef.current = displaySrc;
            setIsLoaded(true);
            setHasError(false);
          }}
          onError={() => {
            if (fallback && displaySrc !== fallback) {
              setDisplaySrc(fallback);
              setIsLoaded(hasImageLoaded(fallback));
              setHasError(false);
              return;
            }
            setHasError(true);
            onErrorRef.current?.();
          }}
        />
      ) : null}

      {!displaySrc || hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--theme-border)_28%,var(--theme-bg))] text-[var(--theme-text-muted)]">
          <span className="sr-only">{fallbackLabel}</span>
          <ImageOff size={24} strokeWidth={1.5} className="opacity-45" aria-hidden />
        </div>
      ) : null}
    </div>
  );
}

export default StableImage;
