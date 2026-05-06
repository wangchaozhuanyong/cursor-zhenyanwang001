import { cn } from "@/lib/utils";
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
}: ProgressiveImageProps) {
  const [hiResLoaded, setHiResLoaded] = useState(false);

  useEffect(() => setHiResLoaded(false), [src]);

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
        src={src}
        alt={alt}
        sizes={sizes}
        {...(fetchPriority ? { fetchPriority } : {})}
        draggable={false}
        onLoad={() => setHiResLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-[400ms] ease-out",
          hiResLoaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </div>
  );
}
