import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useMotionConfig } from "@/modules/micro-interactions";
import { useNavigate } from "react-router-dom";
import { getBannerContainerClassName, getBannerOverlayClassName } from "@/utils/themeVisuals";
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
  opacity: { duration: 0.8, ease: "easeInOut" as const },
  scale: { duration: 1.2, ease: "easeOut" as const },
};

function resolveBannerLink(link: string): string {
  const value = (link || "").trim();
  if (!value) return "";
  return value;
}

export default function BannerCarousel({ banners, loading = false, themeConfigOverride }: BannerCarouselProps) {
  const { themeConfig: runtimeConfig } = useThemeRuntime();
  const bannerStyle = themeConfigOverride?.bannerStyle ?? runtimeConfig.bannerStyle;
  const bannerContainerClass = getBannerContainerClassName(bannerStyle);
  const bannerOverlayClass = getBannerOverlayClassName(bannerStyle);
  const { enabled: motionEnabled } = useMotionConfig();
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  useEffect(() => {
    if (banners.length > 0 && current >= banners.length) {
      setCurrent(0);
    }
  }, [banners.length, current]);

  useEffect(() => {
    banners.forEach((banner) => {
      const src = banner.image?.trim();
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  }, [banners]);

  useEffect(() => {
    if (!motionEnabled || banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [banners.length, motionEnabled]);

  const [touchStart, setTouchStart] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (banners.length <= 1) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goTo((current + 1) % banners.length);
      } else {
        goTo((current - 1 + banners.length) % banners.length);
      }
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
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,var(--theme-surface),var(--theme-bg),var(--theme-surface))]" />
      </div>
    );
  }

  const safeIndex = current >= banners.length ? 0 : current;
  const banner = banners[safeIndex];
  if (!banner) return null;

  const bannerLink = resolveBannerLink(banner.link);
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
      className={`relative overflow-hidden theme-shadow ${bannerContainerClass} ${bannerLink ? "cursor-pointer" : ""}`}
      data-banner-style={bannerStyle}
      data-theme-banner-style={bannerStyle}
      style={{
        aspectRatio: BANNER_ASPECT_CSS,
        borderRadius: bannerStyle === "premium" || bannerStyle === "fresh" ? undefined : "var(--theme-radius)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleOpenBanner}
    >
      <div className="absolute inset-0">
        {banners.map((item, index) => {
          const isActive = index === safeIndex;
          const alt = item.title?.trim() || `首页轮播图 ${index + 1}`;
          const sharedClass = "absolute inset-0 h-full w-full object-cover object-center";

          if (motionEnabled) {
            return (
              <motion.img
                key={item.id || index}
                src={item.image}
                alt={alt}
                width={BANNER_IMAGE_WIDTH}
                height={BANNER_IMAGE_HEIGHT}
                className={sharedClass}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1 : 1.03,
                }}
                transition={CROSSFADE_TRANSITION}
                style={{
                  zIndex: isActive ? 2 : 1,
                  pointerEvents: isActive ? "auto" : "none",
                }}
              />
            );
          }

          return (
            <img
              key={item.id || index}
              src={item.image}
              alt={alt}
              width={BANNER_IMAGE_WIDTH}
              height={BANNER_IMAGE_HEIGHT}
              className={`${sharedClass} transition-[opacity,transform] duration-700 ease-in-out`}
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? "scale(1)" : "scale(1.03)",
                zIndex: isActive ? 2 : 1,
                pointerEvents: isActive ? "auto" : "none",
              }}
            />
          );
        })}
      </div>

      {bannerOverlayClass ? (
        <div className={`${bannerOverlayClass} z-10`} aria-hidden />
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
                  goTo(index);
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
