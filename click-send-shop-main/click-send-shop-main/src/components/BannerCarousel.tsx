import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useMotionConfig } from "@/modules/micro-interactions/hooks/useMotionConfig";
import { useNavigate } from "react-router-dom";
import { getBannerContainerClassName } from "@/utils/themeVisuals";
import { trackEventLazy } from "@/services/trackEventLazy";
import { getBannerCtaText } from "@/utils/bannerCta";
import {
  BANNER_ASPECT_CSS,
  BANNER_IMAGE_HEIGHT,
  BANNER_IMAGE_WIDTH,
} from "@/constants/bannerAspect";
import type { Banner } from "@/types/banner";
import type { ThemeConfig } from "@/types/theme";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface BannerCarouselProps {
  banners: Banner[];
  loading?: boolean;
  paused?: boolean;
  trackingModule?: string;
  ariaLabelPrefix?: string;
  themeConfigOverride?: ThemeConfig;
}

const AUTO_ROTATE_MS = 4800;
const USER_INTERACTION_PAUSE_MS = 7200;
const STATIC_HOME_BANNER_RE = /^(.*\/assets\/home-banners\/home-hero-\d{2}-[^?#]+?)(-mobile)?(\.webp)(\?.*)?$/i;
const loadedBannerImages = new Set<string>();

function getImageCacheKeys(...values: Array<string | undefined | null>): string[] {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function hasLoadedImage(...values: Array<string | undefined | null>): boolean {
  return getImageCacheKeys(...values).some((value) => loadedBannerImages.has(value));
}

function markImageLoaded(...values: Array<string | undefined | null>) {
  getImageCacheKeys(...values).forEach((value) => loadedBannerImages.add(value));
}

function resolveBannerLink(link: string): string {
  const value = (link || "").trim();
  if (!value) return "";
  return value;
}

function getResponsiveBannerImage(image: string): { src: string; srcSet?: string; sizes?: string } {
  const src = image.trim();
  const match = src.match(STATIC_HOME_BANNER_RE);
  if (!match) return { src };

  const [, base, , ext, query = ""] = match;
  const desktop = `${base}${ext}${query}`;
  const mobile = `${base}-mobile${ext}${query}`;
  return {
    src: desktop,
    srcSet: `${mobile} 1080w, ${desktop} 1920w`,
    sizes: "(max-width: 768px) 100vw, 1200px",
  };
}

function splitBannerDescription(description: string): { subtitle: string; body: string } {
  const value = description.trim();
  if (!value) return { subtitle: "", body: "" };
  const lines = value
    .split(/\r?\n|[|｜]/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return { subtitle: lines[0], body: lines.slice(1).join(" ") };
  }
  const match = value.match(/^(.{6,26}?[。；;，,])(.+)$/);
  if (match) {
    return { subtitle: match[1].replace(/[。；;，,]$/, ""), body: match[2].trim() };
  }
  return { subtitle: "", body: value };
}

export default function BannerCarousel({
  banners,
  loading = false,
  paused = false,
  trackingModule = "home_banner",
  ariaLabelPrefix = "首页轮播图",
  themeConfigOverride,
}: BannerCarouselProps) {
  const { themeConfig: runtimeConfig } = useThemeRuntime();
  const bannerStyle = themeConfigOverride?.bannerStyle ?? runtimeConfig.bannerStyle;
  const bannerContainerClass = getBannerContainerClassName(bannerStyle);
  const { enabled: motionEnabled } = useMotionConfig();
  const [current, setCurrent] = useState(0);
  const safeIndex = banners.length > 0 && current < banners.length ? current : 0;
  const banner = banners[safeIndex] ?? null;
  const activeImage = banner?.image?.trim() || "";
  const responsiveImage = getResponsiveBannerImage(activeImage);
  const nextBannerImage = banners.length > 1
    ? banners[(safeIndex + 1) % banners.length]?.image?.trim() || ""
    : "";
  const [activeImageLoaded, setActiveImageLoaded] = useState(() => (
    hasLoadedImage(activeImage, responsiveImage.src, responsiveImage.srcSet)
  ));
  const [activeImageFailed, setActiveImageFailed] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [manualPauseUntil, setManualPauseUntil] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const navigate = useNavigate();
  const activeImageReady = !activeImage || activeImageLoaded || activeImageFailed;

  const goTo = useCallback((index: number, userDriven = false) => {
    setCurrent(index);
    if (userDriven) {
      setManualPauseUntil(Date.now() + USER_INTERACTION_PAUSE_MS);
    }
  }, []);

  useEffect(() => {
    if (banners.length > 0 && current >= banners.length) {
      setCurrent(0);
    }
  }, [banners.length, current]);

  useEffect(() => {
    setActiveImageLoaded(hasLoadedImage(activeImage, responsiveImage.src, responsiveImage.srcSet));
    setActiveImageFailed(false);
  }, [activeImage, responsiveImage.src, responsiveImage.srcSet]);

  useEffect(() => {
    if (!nextBannerImage || nextBannerImage === activeImage) return;
    const timer = window.setTimeout(() => {
      const img = new Image();
      img.decoding = "async";
      (img as HTMLImageElement & { fetchPriority?: "low" }).fetchPriority = "low";
      const nextResponsiveImage = getResponsiveBannerImage(nextBannerImage);
      img.onload = () => {
        markImageLoaded(nextBannerImage, nextResponsiveImage.src, nextResponsiveImage.srcSet, img.currentSrc, img.src);
      };
      if (nextResponsiveImage.srcSet) {
        img.srcset = nextResponsiveImage.srcSet;
        img.sizes = nextResponsiveImage.sizes || "100vw";
      }
      img.src = nextResponsiveImage.src;
    }, 800);
    return () => window.clearTimeout(timer);
  }, [activeImage, nextBannerImage]);

  useEffect(() => {
    if (paused || hoverPaused || !motionEnabled || banners.length <= 1) return;
    const timer = window.setInterval(() => {
      if (Date.now() < manualPauseUntil) return;
      setCurrent((prev) => (prev + 1) % banners.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [banners.length, hoverPaused, manualPauseUntil, motionEnabled, paused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (banners.length <= 1) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? (current + 1) % banners.length : (current - 1 + banners.length) % banners.length, true);
    }
  };

  if (banners.length === 0) {
    if (!loading) return null;
    return (
      <div
        className="store-hero-loading-shell relative overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)]"
        style={{ aspectRatio: BANNER_ASPECT_CSS, borderRadius: "var(--theme-radius)" }}
        aria-busy="true"
      >
        <div className="absolute inset-0 skeleton-base skeleton-shimmer" />
        <div className="store-hero-loading-copy" aria-hidden>
          <span className="store-hero-loading-kicker" />
          <span className="store-hero-loading-title" />
          <span className="store-hero-loading-line" />
        </div>
        <div className="store-hero-loading-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!banner) return null;

  const bannerLink = resolveBannerLink(banner.link);
  const bannerTitle = banner.title?.trim() || "";
  const bannerDescription = banner.description?.trim() || "";
  const bannerCopy = splitBannerDescription(bannerDescription);
  const bannerCtaText = getBannerCtaText(banner);
  const hasTextLayer = Boolean(bannerTitle || bannerDescription || bannerCtaText);
  const showControls = banners.length > 1;
  const fallbackLabel = `${ariaLabelPrefix} ${safeIndex + 1}`;

  const handleOpenBanner = () => {
    if (!bannerLink) return;
    trackEventLazy({ event_type: "banner_click", module: trackingModule, activity_id: banner.id });
    if (/^https?:\/\//i.test(bannerLink)) {
      window.open(bannerLink, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(bannerLink.startsWith("/") ? bannerLink : `/${bannerLink}`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!bannerLink || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    handleOpenBanner();
  };

  return (
    <div
      className={`store-hero-carousel store-hero-carousel--showcase relative w-full overflow-hidden ${bannerContainerClass} ${bannerLink ? "cursor-pointer" : ""}`}
      data-banner-style={bannerStyle}
      data-theme-banner-style={bannerStyle}
      style={{
        aspectRatio: BANNER_ASPECT_CSS,
        borderRadius: bannerStyle === "premium" || bannerStyle === "fresh" ? undefined : "var(--theme-radius)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onClick={handleOpenBanner}
      onKeyDown={handleKeyDown}
      role={bannerLink ? "button" : undefined}
      tabIndex={bannerLink ? 0 : undefined}
      aria-label={bannerLink ? `打开轮播图：${bannerTitle || fallbackLabel}` : undefined}
    >
      <div className="absolute inset-0">
        <div
          className={`absolute inset-0 skeleton-base skeleton-shimmer transition-opacity duration-300 ${
            activeImageReady ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden
        />
        {activeImage ? (
          <img
            key={banner.id || activeImage || safeIndex}
            src={responsiveImage.src}
            srcSet={responsiveImage.srcSet}
            sizes={responsiveImage.sizes}
            alt={bannerTitle || fallbackLabel}
            width={BANNER_IMAGE_WIDTH}
            height={BANNER_IMAGE_HEIGHT}
            loading="eager"
            {...({ fetchpriority: "high" } as Record<string, string>)}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out ${
              hasTextLayer ? "store-hero-image-with-copy" : "object-center"
            }`}
            style={{
              opacity: activeImageLoaded ? 1 : 0,
              transform: activeImageLoaded ? "translate3d(0, 0, 0) scale(1)" : "translate3d(0, 8px, 0) scale(1.018)",
            }}
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth > 0) {
                markImageLoaded(
                  activeImage,
                  responsiveImage.src,
                  responsiveImage.srcSet,
                  event.currentTarget.currentSrc,
                  event.currentTarget.src,
                );
                setActiveImageLoaded(true);
                setActiveImageFailed(false);
              }
            }}
            onError={() => {
              setActiveImageLoaded(false);
              setActiveImageFailed(true);
            }}
          />
        ) : null}
      </div>

      {hasTextLayer ? (
        <>
          <div className="store-hero-text-wash pointer-events-none absolute inset-0 z-10" aria-hidden />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-full items-center px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
            <div
              key={`copy-${banner.id || safeIndex}`}
              className="store-hero-copy-panel"
              style={motionEnabled ? {
                opacity: 1,
                transform: activeImageReady ? "translate3d(0, 0, 0)" : "translate3d(-6px, 0, 0)",
                transition: "opacity 420ms ease-out, transform 420ms ease-out",
              } : undefined}
            >
              {bannerTitle ? (
                <h2 className="store-hero-copy-title text-[16px] font-bold leading-tight text-[var(--theme-text-on-surface)] sm:text-xl lg:text-3xl">
                  {bannerTitle}
                </h2>
              ) : null}
              {bannerTitle && (bannerCopy.subtitle || bannerCopy.body) ? (
                <span className="store-hero-copy-divider" aria-hidden="true" />
              ) : null}
              {bannerCopy.subtitle ? (
                <p className="store-hero-copy-subtitle mt-1.5 text-[12px] font-semibold leading-5 text-[var(--theme-text-muted-on-surface)] sm:mt-2 sm:text-base sm:leading-6 lg:text-xl lg:leading-8">
                  {bannerCopy.subtitle}
                </p>
              ) : null}
              {bannerCopy.body ? (
                <p className="store-hero-copy-desc mt-1 text-[11px] leading-5 text-[var(--theme-text-muted-on-surface)] sm:mt-1.5 sm:text-sm sm:leading-6 lg:text-base lg:leading-7">
                  {bannerCopy.body}
                </p>
              ) : null}
              {bannerCtaText ? (
                <UnifiedButton
                  type="button"
                  className="store-hero-copy-cta pointer-events-auto mt-3 inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold sm:mt-4 sm:px-4 sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenBanner();
                  }}
                >
                  <span className="truncate">{bannerCtaText}</span>
                  <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
                </UnifiedButton>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {showControls ? (
        <div
          className="store-hero-indicators pointer-events-auto absolute z-30"
          onClick={(e) => e.stopPropagation()}
          aria-label="轮播图分页"
        >
          <div className="store-hero-dots">
            {banners.map((_, index) => (
              <UnifiedButton
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(index, true);
                }}
                className="store-hero-dot-button"
                aria-label={`第 ${index + 1} 张轮播图`}
                aria-current={index === safeIndex ? "true" : undefined}
              >
                <span className="store-hero-dot block rounded-full transition-all duration-200" />
              </UnifiedButton>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
