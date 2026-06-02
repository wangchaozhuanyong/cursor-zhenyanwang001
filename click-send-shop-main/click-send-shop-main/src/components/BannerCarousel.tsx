import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useMotionConfig } from "@/modules/micro-interactions";
import { useNavigate } from "react-router-dom";
import { getBannerContainerClassName } from "@/utils/themeVisuals";
import { trackEvent } from "@/services/analyticsService";
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

const CROSSFADE_TRANSITION = {
  opacity: { duration: 0.46, ease: "easeOut" as const },
  scale: { duration: 0.78, ease: "easeOut" as const },
  y: { duration: 0.58, ease: "easeOut" as const },
};

const AUTO_ROTATE_MS = 5600;
const USER_INTERACTION_PAUSE_MS = 7200;

function resolveBannerLink(link: string): string {
  const value = (link || "").trim();
  if (!value) return "";
  return value;
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
  const nextBannerImage = banners.length > 1
    ? banners[(safeIndex + 1) % banners.length]?.image?.trim() || ""
    : "";
  const [activeImageLoaded, setActiveImageLoaded] = useState(false);
  const imageLoadSeqRef = useRef(0);
  const [touchStart, setTouchStart] = useState(0);
  const [manualPauseUntil, setManualPauseUntil] = useState(0);
  const navigate = useNavigate();

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
    const seq = imageLoadSeqRef.current + 1;
    imageLoadSeqRef.current = seq;
    setActiveImageLoaded(false);
    if (!activeImage) return;

    const markLoaded = () => {
      if (imageLoadSeqRef.current === seq) {
        setActiveImageLoaded(true);
      }
    };

    const img = new Image();
    img.decoding = "async";
    (img as HTMLImageElement & { fetchPriority?: "high" }).fetchPriority = "high";
    img.onload = markLoaded;
    img.src = activeImage;

    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
      return;
    }

    if (typeof img.decode === "function") {
      void img.decode().then(markLoaded).catch(() => {
        if (img.complete && img.naturalWidth > 0) markLoaded();
      });
    }
  }, [activeImage]);

  useEffect(() => {
    if (!nextBannerImage || nextBannerImage === activeImage) return;
    const timer = window.setTimeout(() => {
      const img = new Image();
      img.decoding = "async";
      (img as HTMLImageElement & { fetchPriority?: "low" }).fetchPriority = "low";
      img.src = nextBannerImage;
    }, 800);
    return () => window.clearTimeout(timer);
  }, [activeImage, nextBannerImage]);

  useEffect(() => {
    if (paused || !motionEnabled || banners.length <= 1) return;
    const timer = window.setInterval(() => {
      if (Date.now() < manualPauseUntil) return;
      setCurrent((prev) => (prev + 1) % banners.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [banners.length, manualPauseUntil, motionEnabled, paused]);

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
    void trackEvent({ event_type: "banner_click", module: trackingModule, activity_id: banner.id });
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

  const stepBanner = (delta: number) => {
    if (banners.length <= 1) return;
    goTo((safeIndex + delta + banners.length) % banners.length, true);
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
      onClick={handleOpenBanner}
      onKeyDown={handleKeyDown}
      role={bannerLink ? "button" : undefined}
      tabIndex={bannerLink ? 0 : undefined}
      aria-label={bannerLink ? `打开轮播图：${bannerTitle || fallbackLabel}` : undefined}
    >
      <div className="absolute inset-0">
        <div
          className={`absolute inset-0 skeleton-base skeleton-shimmer transition-opacity duration-300 ${
            activeImageLoaded ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden
        />
        {activeImage && motionEnabled ? (
          <AnimatePresence initial={false}>
            <motion.img
              key={banner.id || activeImage || safeIndex}
              src={activeImage}
              alt={bannerTitle || fallbackLabel}
              width={BANNER_IMAGE_WIDTH}
              height={BANNER_IMAGE_HEIGHT}
              loading="eager"
              {...({ fetchpriority: "high" } as Record<string, string>)}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover ${
                hasTextLayer ? "store-hero-image-with-copy" : "object-center"
              }`}
              initial={{ opacity: 0, scale: 1.024, y: 8 }}
              animate={{
                opacity: activeImageLoaded ? 1 : 0,
                scale: activeImageLoaded ? 1 : 1.018,
                y: activeImageLoaded ? 0 : 8,
              }}
              exit={{ opacity: 0, scale: 1.012, y: -5 }}
              transition={CROSSFADE_TRANSITION}
              onLoad={(event) => {
                if (event.currentTarget.naturalWidth > 0) setActiveImageLoaded(true);
              }}
            />
          </AnimatePresence>
        ) : activeImage ? (
          <img
            key={banner.id || activeImage || safeIndex}
            src={activeImage}
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
              transform: activeImageLoaded ? "scale(1)" : "scale(1.018)",
            }}
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth > 0) setActiveImageLoaded(true);
            }}
          />
        ) : null}
      </div>

      {hasTextLayer ? (
        <>
          {activeImage ? (
            <div className="store-hero-story-layer pointer-events-none absolute inset-y-0 left-0 z-10" aria-hidden>
              <img src={activeImage} alt="" className="store-hero-story-image" loading="eager" decoding="async" />
              <div className="store-hero-story-tint" />
            </div>
          ) : null}
          <div className="store-hero-text-wash pointer-events-none absolute inset-0 z-10" aria-hidden />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-full items-center px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
            <motion.div
              key={`copy-${banner.id || safeIndex}`}
              className="store-hero-copy-panel"
              initial={motionEnabled ? { opacity: 0, x: -10 } : false}
              animate={motionEnabled ? { opacity: 1, x: 0 } : undefined}
              transition={{ duration: 0.42, ease: "easeOut" }}
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
                  <ArrowRight size={14} aria-hidden="true" />
                </UnifiedButton>
              ) : null}
            </motion.div>
          </div>
        </>
      ) : null}

      {showControls ? (
        <div
          className="store-hero-controls pointer-events-auto absolute z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <UnifiedButton
            type="button"
            className="store-hero-control-button"
            onClick={(e) => {
              e.stopPropagation();
              stepBanner(-1);
            }}
            aria-label="上一张轮播图"
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </UnifiedButton>
          <div className="store-hero-dots" aria-label="轮播图分页">
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
                {motionEnabled ? (
                  <motion.div
                    className="store-hero-dot"
                    animate={{
                      width: index === safeIndex ? 12 : 5,
                      height: 3.5,
                      opacity: index === safeIndex ? 1 : 0.45,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <span
                    className={`store-hero-dot block h-1 rounded-full transition-all ${
                      index === safeIndex ? "w-4 opacity-100" : "w-1.5 opacity-40"
                    }`}
                  />
                )}
              </UnifiedButton>
            ))}
          </div>
          <UnifiedButton
            type="button"
            className="store-hero-control-button"
            onClick={(e) => {
              e.stopPropagation();
              stepBanner(1);
            }}
            aria-label="下一张轮播图"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </UnifiedButton>
        </div>
      ) : null}
    </div>
  );
}
