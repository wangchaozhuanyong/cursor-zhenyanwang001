import { cn } from "@/lib/utils";
import StableImage from "@/components/ui/StableImage";

type StoreBrandLogoVariant = "nav" | "category" | "profile";

type StoreBrandLogoProps = {
  src?: string;
  siteName: string;
  variant?: StoreBrandLogoVariant;
  className?: string;
  fallbackText?: string;
  width?: number;
  height?: number;
};

export default function StoreBrandLogo({
  src,
  siteName,
  variant = "nav",
  className,
  fallbackText,
  width = 36,
  height = 36,
}: StoreBrandLogoProps) {
  const fallback = fallbackText ?? siteName.trim().slice(0, 1);
  const hasVisual = Boolean(src || fallback);

  return (
    <span
      className={cn(
        "store-brand-logo flex shrink-0 items-center justify-center",
        variant !== "nav" && `store-brand-logo--${variant}`,
        className,
      )}
      aria-hidden={!hasVisual}
    >
      {src ? (
        <StableImage
          src={src}
          alt={`${siteName} Logo`}
          width={width}
          height={height}
          className="store-brand-logo-image"
          imgClassName="object-contain"
          loading="eager"
          fetchPriority="high"
          objectFit="contain"
        />
      ) : fallback ? (
        <span className="store-brand-logo-fallback">{fallback}</span>
      ) : null}
    </span>
  );
}
