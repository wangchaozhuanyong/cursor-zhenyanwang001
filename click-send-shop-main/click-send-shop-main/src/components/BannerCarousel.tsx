import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
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
import RatioImage, { type ClientImageRatio } from "@/components/client/RatioImage";
import { getBannerCopyToneFromImage, type BannerCopyTone } from "@/utils/bannerTextTone";
import { hasLoadedImage, markImageLoaded, rememberLoadedImageFromElement } from "@/utils/imageLoadMemory";

interface BannerCarouselProps {
  banners: Banner[];
  loading?: boolean;
  paused?: boolean;
  trackingModule?: string;
  ariaLabelPrefix?: string;
  themeConfigOverride?: ThemeConfig;
  autoRotateMs?: number;
  showCopyLayer?: boolean;
  onActiveBannerChange?: (banner: Banner | null) => void;
}

const AUTO_ROTATE_MS = 5200;
const INITIAL_AUTO_ROTATE_DELAY_MS = 2200;
const USER_INTERACTION_PAUSE_MS = 7200;
const STATIC_HOME_BANNER_RE = /^(.*\/assets\/home-banners\/home-hero-\d{2}-[^?#]+?)(-mobile)?(\.webp)(\?.*)?$/i;
const STATIC_HOME_BANNER_VERSION = String(import.meta.env.VITE_STATIC_HOME_BANNER_VERSION || "").trim();
type SlideDirection = "forward" | "backward";

function preloadBannerImage(image: string, priority: "high" | "low" = "low") {
  if (!image || hasLoadedImage(image)) return;
  const responsiveImage = getResponsiveBannerImage(image);
  if (hasLoadedImage(image, responsiveImage.src, responsiveImage.srcSet)) return;

  const img = new Image();
  img.decoding = "async";
  (img as HTMLImageElement & { fetchPriority?: "high" | "low" }).fetchPriority = priority;
  img.onload = () => {
    markImageLoaded(image, responsiveImage.src, responsiveImage.srcSet, img.currentSrc, img.src);
  };
  if (responsiveImage.srcSet) {
    img.srcset = responsiveImage.srcSet;
    img.sizes = responsiveImage.sizes || "100vw";
  }
  img.src = responsiveImage.src;
}

function warnLargeBannerImage(image: string, id?: string) {
  if (!image || !import.meta.env.DEV) return;
  const isDataUrl = /^\s*data:/i.test(image);
  const approxBytes = isDataUrl ? Math.ceil(image.length * 0.75) : image.length;
  if (!isDataUrl && approxBytes <= 300 * 1024) return;
  console.warn("[banner.performance]", {
    id,
    reason: isDataUrl ? "data_url_banner" : "large_banner_url",
    approxBytes,
  });
}

function resolveBannerLink(link: string): string {
  const value = (link || "").trim();
  if (!value) return "";
  return value;
}

function appendStaticBannerVersion(url: string): string {
  if (!STATIC_HOME_BANNER_VERSION || /[?&]hbv=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}hbv=${encodeURIComponent(STATIC_HOME_BANNER_VERSION)}`;
}

function getResponsiveBannerImage(image: string): { src: string; srcSet?: string; sizes?: string } {
  const src = image.trim();
  const match = src.match(STATIC_HOME_BANNER_RE);
  if (!match) return { src };

  const [, base, , ext, query = ""] = match;
  const desktop = appendStaticBannerVersion(`${base}${ext}${query}`);
  const mobile = appendStaticBannerVersion(`${base}-mobile${ext}${query}`);
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
  autoRotateMs,
  showCopyLayer = true,
  onActiveBannerChange,
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
  const bannerLink = resolveBannerLink(banner?.link ?? "");
  const bannerTitle = banner?.title?.trim() || "";
  const bannerDescription = banner?.description?.trim() || "";
  const bannerCopy = splitBannerDescription(bannerDescription);
  const bannerCtaText = banner ? getBannerCtaText(banner) : "";
  const hasTextLayer = showCopyLayer && Boolean(bannerTitle || bannerDescription || bannerCtaText);
  const showControls = banners.length > 1;
  const fallbackLabel = `${ariaLabelPrefix} ${safeIndex + 1}`;
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
  const [copyTone, setCopyTone] = useState<BannerCopyTone>("light");
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("forward");
  const activeImageRef = useRef<HTMLImageElement | null>(null);
  const copyPanelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const activeImageReady = !activeImage || activeImageLoaded || activeImageFailed;
  const resolvedAutoRotateMs = typeof autoRotateMs === "number" && Number.isFinite(autoRotateMs)
    ? Math.min(20_000, Math.max(3_000, Math.trunc(Number(autoRotateMs))))
    : AUTO_ROTATE_MS;

  useEffect(() => {
    onActiveBannerChange?.(banner);
  }, [banner, onActiveBannerChange]);

  const refreshCopyTone = useCallback(() => {
    if (!hasTextLayer) return;
    setCopyTone(getBannerCopyToneFromImage(activeImageRef.current, copyPanelRef.current, "light"));
  }, [hasTextLayer]);

  const goTo = useCallback((index: number, userDriven = false) => {
    const nextIndex = Math.max(0, Math.min(index, banners.length - 1));
    setSlideDirection(nextIndex >= current ? "forward" : "backward");
    setCurrent(nextIndex);
    if (userDriven) {
      setManualPauseUntil(Date.now() + USER_INTERACTION_PAUSE_MS);
    }
  }, [banners.length, current]);

  useEffect(() => {
    if (banners.length > 0 && current >= banners.length) {
      setCurrent(0);
    }
  }, [banners.length, current]);

  useEffect(() => {
    setActiveImageLoaded(hasLoadedImage(activeImage, responsiveImage.src, responsiveImage.srcSet));
    setActiveImageFailed(false);
    setCopyTone("light");
  }, [activeImage, responsiveImage.src, responsiveImage.srcSet]);

  useEffect(() => {
    const img = activeImageRef.current;
    if (!img || !activeImage) return;

    const markLoadedIfReady = () => {
      if (!rememberLoadedImageFromElement(img, activeImage, responsiveImage.src, responsiveImage.srcSet)) return;
      setActiveImageLoaded(true);
      setActiveImageFailed(false);
      refreshCopyTone();
    };

    markLoadedIfReady();
    const frame = window.requestAnimationFrame(markLoadedIfReady);
    const timer = window.setTimeout(markLoadedIfReady, 160);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [activeImage, refreshCopyTone, responsiveImage.src, responsiveImage.srcSet]);

  useEffect(() => {
    if (!hasTextLayer || !activeImageReady) return;
    const updateTone = () => refreshCopyTone();
    const frame = window.requestAnimationFrame(updateTone);
    const timer = window.setTimeout(updateTone, 180);
    window.addEventListener("resize", updateTone);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateTone);
    };
  }, [activeImageReady, hasTextLayer, refreshCopyTone, safeIndex]);

  useEffect(() => {
    if (!nextBannerImage || nextBannerImage === activeImage) return;
    const timer = window.setTimeout(() => {
      preloadBannerImage(nextBannerImage);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeImage, banners, nextBannerImage, safeIndex]);

  useEffect(() => {
    if (paused || hoverPaused || !motionEnabled || banners.length <= 1) return;
    let delay = INITIAL_AUTO_ROTATE_DELAY_MS;
    let timer: ReturnType<typeof window.setTimeout>;
    const scheduleNext = () => {
      timer = window.setTimeout(() => {
        if (Date.now() >= manualPauseUntil) {
          setSlideDirection("forward");
          setCurrent((prev) => (prev + 1) % banners.length);
        }
        delay = resolvedAutoRotateMs;
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => window.clearTimeout(timer);
  }, [banners.length, hoverPaused, manualPauseUntil, motionEnabled, paused, resolvedAutoRotateMs]);

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
        className={`store-hero-carousel store-hero-carousel--showcase store-hero-loading-shell store-skin-banner relative w-full overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)] ${bannerContainerClass}`}
        data-banner-style={bannerStyle}
        data-theme-banner-style={bannerStyle}
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

  const bannerImageNodes = banners.map((item, index) => {
    const image = item.image?.trim() || "";
    if (!image) return null;
    const itemResponsiveImage = getResponsiveBannerImage(image);
    const isActive = index === safeIndex;
    const isNext = showControls && index === (safeIndex + 1) % banners.length;
    if (!isActive && !isNext) return null;
    warnLargeBannerImage(image, item.id);
    const itemTitle = item.title?.trim() || `${ariaLabelPrefix} ${index + 1}`;
    return (
      <RatioImage
        key={item.id || image || index}
        imgRef={isActive ? activeImageRef : undefined}
        src={itemResponsiveImage.src}
        srcSet={itemResponsiveImage.srcSet}
        sizes={itemResponsiveImage.sizes}
        alt={isActive ? itemTitle : ""}
        ariaHidden={!isActive}
        ratio={BANNER_ASPECT_CSS as ClientImageRatio}
        fit="cover"
        rounded="none"
        width={BANNER_IMAGE_WIDTH}
        height={BANNER_IMAGE_HEIGHT}
        loading={isActive || isNext ? "eager" : "lazy"}
        fetchPriority={isActive ? "high" : "low"}
        className="store-hero-slide-image absolute inset-0 h-full w-full"
        imgClassName={hasTextLayer ? "store-hero-image-with-copy object-cover" : "object-cover object-center"}
        dataActive={isActive ? "true" : "false"}
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth <= 0) return;
          markImageLoaded(
            image,
            itemResponsiveImage.src,
            itemResponsiveImage.srcSet,
            event.currentTarget.currentSrc,
            event.currentTarget.src,
          );
          if (isActive) {
            setActiveImageLoaded(true);
            setActiveImageFailed(false);
            refreshCopyTone();
          }
        }}
        onError={() => {
          if (isActive) {
            setActiveImageLoaded(false);
            setActiveImageFailed(true);
          }
        }}
      />
    );
  });
  const rootStyle = {
    aspectRatio: BANNER_ASPECT_CSS,
    borderRadius: bannerStyle === "premium" || bannerStyle === "fresh" ? undefined : "var(--theme-radius)",
    "--store-hero-auto-rotate-ms": `${resolvedAutoRotateMs}ms`,
  } as CSSProperties;

  return (
    <div
      className={`store-hero-carousel store-hero-carousel--showcase store-skin-banner relative w-full overflow-hidden ${bannerContainerClass} ${bannerLink ? "cursor-pointer" : ""}`}
      data-banner-style={bannerStyle}
      data-theme-banner-style={bannerStyle}
      data-banner-has-copy={hasTextLayer ? "true" : "false"}
      data-copy-tone={hasTextLayer ? copyTone : undefined}
      data-slide-direction={slideDirection}
      data-auto-paused={paused || hoverPaused || !motionEnabled ? "true" : "false"}
      style={rootStyle}
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
        {bannerImageNodes}
      </div>

      {hasTextLayer ? (
        <>
          <div className="store-hero-text-wash pointer-events-none absolute inset-0 z-10" aria-hidden />
          <div className="store-hero-copy-zone pointer-events-none absolute inset-y-0 left-0 z-20 flex w-full items-center px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
            <div
              key={`copy-${banner.id || safeIndex}`}
              ref={copyPanelRef}
              className="store-hero-copy-panel"
              data-ready={activeImageReady ? "true" : "false"}
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
