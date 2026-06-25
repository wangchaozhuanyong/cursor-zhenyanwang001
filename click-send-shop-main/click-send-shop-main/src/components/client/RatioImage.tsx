import { useEffect, useMemo, useState, type CSSProperties, type ImgHTMLAttributes, type Ref } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientImageRatio =
  | "var(--theme-image-ratio, 1 / 1)"
  | "1 / 2"
  | "3 / 4"
  | "4 / 3"
  | "4 / 5"
  | "1 / 1"
  | "16 / 9"
  | "117 / 50";

export type RatioImageProps = {
  src?: string | null;
  fallbackSrc?: string | null;
  finalFallbackSrc?: string | null;
  alt: string;
  ratio: ClientImageRatio;
  fit?: "cover" | "contain";
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  imgRef?: Ref<HTMLImageElement>;
  ariaHidden?: boolean;
  dataActive?: "true" | "false";
  onLoad?: ImgHTMLAttributes<HTMLImageElement>["onLoad"];
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
};

const roundedClass: Record<NonNullable<RatioImageProps["rounded"]>, string> = {
  none: "sf-next-ratio-image--rounded-none",
  sm: "sf-next-ratio-image--rounded-sm",
  md: "sf-next-ratio-image--rounded-md",
  lg: "sf-next-ratio-image--rounded-lg",
  xl: "sf-next-ratio-image--rounded-xl",
  full: "sf-next-ratio-image--rounded-full",
};

export default function RatioImage({
  src,
  fallbackSrc,
  finalFallbackSrc,
  alt,
  ratio,
  fit = "cover",
  rounded = "lg",
  loading = "lazy",
  fetchPriority = "auto",
  srcSet,
  sizes,
  width,
  height,
  imgRef,
  ariaHidden = false,
  dataActive,
  onLoad,
  onError,
  className,
  imgClassName,
  placeholderClassName,
}: RatioImageProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const normalizedFallbackSrc = typeof fallbackSrc === "string" ? fallbackSrc.trim() : "";
  const normalizedFinalFallbackSrc = typeof finalFallbackSrc === "string" ? finalFallbackSrc.trim() : "";
  const initialDisplaySrc = useMemo(
    () => normalizedSrc || normalizedFallbackSrc || normalizedFinalFallbackSrc,
    [normalizedFallbackSrc, normalizedFinalFallbackSrc, normalizedSrc],
  );
  const [displaySrc, setDisplaySrc] = useState(initialDisplaySrc);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setDisplaySrc(initialDisplaySrc);
    setHasError(false);
    setIsLoaded(false);
  }, [initialDisplaySrc]);

  const shouldShowImage = Boolean(displaySrc) && !hasError;
  const imageStyle: CSSProperties = { objectFit: fit };
  const fetchPriorityProps = fetchPriority
    ? ({ fetchpriority: fetchPriority } as Record<string, string>)
    : {};

  return (
    <div
      className={cn("sf-next-ratio-image", roundedClass[rounded], className)}
      style={{ aspectRatio: ratio }}
      role={!shouldShowImage ? "img" : undefined}
      aria-label={!shouldShowImage ? alt : undefined}
      aria-hidden={ariaHidden || undefined}
      data-ratio={ratio}
      data-active={dataActive}
      data-loaded={shouldShowImage && isLoaded ? "true" : "false"}
    >
      {shouldShowImage && !isLoaded ? (
        <div className={cn("sf-next-ratio-image__loading", placeholderClassName)} aria-hidden="true" />
      ) : null}
      {shouldShowImage ? (
        <img
          ref={imgRef}
          src={displaySrc}
          srcSet={displaySrc === normalizedSrc ? srcSet : undefined}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          draggable={false}
          sizes={sizes}
          {...fetchPriorityProps}
          className={cn("sf-next-ratio-image__img", imgClassName)}
          style={imageStyle}
          onLoad={(event) => {
            setIsLoaded(true);
            onLoad?.(event);
          }}
          onError={(event) => {
            if (normalizedFallbackSrc && displaySrc !== normalizedFallbackSrc) {
              setDisplaySrc(normalizedFallbackSrc);
              setHasError(false);
              setIsLoaded(false);
              return;
            }
            if (normalizedFinalFallbackSrc && displaySrc !== normalizedFinalFallbackSrc) {
              setDisplaySrc(normalizedFinalFallbackSrc);
              setHasError(false);
              setIsLoaded(false);
              return;
            }
            setHasError(true);
            setIsLoaded(false);
            onError?.(event);
          }}
        />
      ) : (
        <div className={cn("sf-next-ratio-image__placeholder", placeholderClassName)}>
          <ImageOff size={18} aria-hidden />
          <span>暂无图片</span>
        </div>
      )}
    </div>
  );
}
