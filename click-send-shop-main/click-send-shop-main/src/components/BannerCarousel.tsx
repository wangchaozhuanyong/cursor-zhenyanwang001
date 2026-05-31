import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useMotionConfig } from "@/modules/micro-interactions";
import { useNavigate } from "react-router-dom";
import { getBannerContainerClassName } from "@/utils/themeVisuals";
import { trackEvent } from "@/services/analyticsService";
import {
  BANNER_ASPECT_CSS,
  BANNER_IMAGE_HEIGHT,
  BANNER_IMAGE_WIDTH,
} from "@/constants/bannerAspect";
import type { Banner } from "@/types/banner";
import type { ThemeConfig } from "@/types/theme";

interface BannerCarouselProps {
  banners: Banner[];
  loading?: boolean;
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

export default function BannerCarousel({ banners, loading = false, themeConfigOverride }: BannerCarouselProps) {
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
    setActiveImageLoaded(false);
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
    if (!motionEnabled || banners.length <= 1) return;
    const timer = window.setInterval(() => {
      if (Date.now() < manualPauseUntil) return;
      setCurrent((prev) => (prev + 1) % banners.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [banners.length, manualPauseUntil, motionEnabled]);

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
        className="relative overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)]"
        style={{ aspectRatio: BANNER_ASPECT_CSS, borderRadius: "var(--theme-radius)" }}
        aria-busy="true"
      >
        <div className="absolute inset-0 skeleton-base skeleton-shimmer" />
      </div>
    );
  }

  if (!banner) return null;

  const bannerLink = resolveBannerLink(banner.link);
  const bannerTitle = banner.title?.trim() || "";
  const bannerDescription = banner.description?.trim() || "";
  const hasTextLayer = Boolean(bannerTitle || bannerDescription);
  const showDots = banners.length > 1;

  const handleOpenBanner = () => {
    if (!bannerLink) return;
    void trackEvent({ event_type: "banner_click", module: "home_banner", activity_id: banner.id });
    if (/^https?:\/\//i.test(bannerLink)) {
      window.open(bannerLink, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(bannerLink.startsWith("/") ? bannerLink : `/${bannerLink}`);
  };

  return (
    <div
      className={`store-hero-carousel relative w-full overflow-hidden ${bannerContainerClass} ${bannerLink ? "cursor-pointer" : ""}`}
      data-banner-style={bannerStyle}
      data-theme-banner-style={bannerStyle}
      style={{
        aspectRatio: BANNER_ASPECT_CSS,
        minHeight: "min(210px, max(180px, calc(100vw * 0.43)))",
        maxHeight: "26rem",
        borderRadius: bannerStyle === "premium" || bannerStyle === "fresh" ? undefined : "var(--theme-radius)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleOpenBanner}
    >
      <div className="absolute inset-0">
        <div
          className={`absolute inset-0 skeleton-base skeleton-shimmer transition-opacity duration-300 ${
            activeImageLoaded ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden
        />
        {activeImage && motionEnabled ? (
          <AnimatePresence initial={false} mode="wait">
            <motion.img
              key={banner.id || activeImage || safeIndex}
              src={activeImage}
              alt={bannerTitle || `首页轮播图 ${safeIndex + 1}`}
              width={BANNER_IMAGE_WIDTH}
              height={BANNER_IMAGE_HEIGHT}
              loading="eager"
              fetchPriority="high"
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
              onLoad={() => setActiveImageLoaded(true)}
            />
          </AnimatePresence>
        ) : activeImage ? (
          <img
            key={banner.id || activeImage || safeIndex}
            src={activeImage}
            alt={bannerTitle || `首页轮播图 ${safeIndex + 1}`}
            width={BANNER_IMAGE_WIDTH}
            height={BANNER_IMAGE_HEIGHT}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out ${
              hasTextLayer ? "store-hero-image-with-copy" : "object-center"
            }`}
            style={{
              opacity: activeImageLoaded ? 1 : 0,
              transform: activeImageLoaded ? "scale(1)" : "scale(1.018)",
            }}
            onLoad={() => setActiveImageLoaded(true)}
          />
        ) : null}
      </div>

      {hasTextLayer ? (
        <>
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
                <h2 className="store-hero-copy-title line-clamp-2 text-[16px] font-bold leading-tight text-[var(--theme-text-on-surface)] sm:text-xl lg:text-3xl">
                  {bannerTitle}
                </h2>
              ) : null}
              {bannerDescription ? (
                <p className="store-hero-copy-desc mt-1.5 line-clamp-2 text-[11px] leading-5 text-[var(--theme-text-muted-on-surface)] sm:mt-2 sm:text-sm sm:leading-6 lg:text-base lg:leading-7">
                  {bannerDescription}
                </p>
              ) : null}
            </motion.div>
          </div>
        </>
      ) : null}

      {showDots ? (
        <div
          className="pointer-events-auto absolute bottom-2 right-2 z-30 rounded-full border border-white/35 bg-[color-mix(in_srgb,var(--theme-surface)_76%,transparent)] px-1.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:bottom-2.5 sm:right-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-2 items-center gap-1">
            {banners.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(index, true);
                }}
                className="flex h-3 min-w-3 items-center justify-center rounded-full px-0.5 transition-transform active:scale-95"
                aria-label={`Banner ${index + 1}`}
                aria-current={index === safeIndex ? "true" : undefined}
              >
                {motionEnabled ? (
                  <motion.div
                    className="rounded-full bg-[var(--theme-primary)]"
                    animate={{
                      width: index === safeIndex ? 14 : 4,
                      height: 4,
                      opacity: index === safeIndex ? 1 : 0.35,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <span
                    className={`block h-1 rounded-full bg-[var(--theme-primary)] transition-all ${
                      index === safeIndex ? "w-3.5 opacity-100" : "w-1 opacity-35"
                    }`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
