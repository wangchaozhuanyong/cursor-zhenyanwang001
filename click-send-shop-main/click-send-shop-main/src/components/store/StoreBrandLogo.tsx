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
        "sf-next-brand-logo flex shrink-0 items-center justify-center",
        variant !== "nav" && `sf-next-brand-logo--${variant}`,
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
          className="sf-next-brand-logo__image"
          imgClassName="object-contain"
          loading="eager"
          fetchPriority="high"
          objectFit="contain"
        />
      ) : fallback ? (
        <span className="sf-next-brand-logo__fallback">{fallback}</span>
      ) : null}
    </span>
  );
}
