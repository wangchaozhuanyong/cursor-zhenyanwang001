import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useMotionConfig } from "@/modules/micro-interactions";
import { useNavigate } from "react-router-dom";
import { getBannerContainerClassName, getBannerOverlayClassName } from "@/utils/themeVisuals";
import type { Banner } from "@/types/banner";
import type { ThemeConfig } from "@/types/theme";

interface BannerCarouselProps {
  banners: Banner[];
  loading?: boolean;
  themeConfigOverride?: ThemeConfig;
}

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
    if (!motionEnabled || banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length, motionEnabled]);

  const [touchStart, setTouchStart] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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
        style={{ aspectRatio: "2.34 / 1", borderRadius: "var(--theme-radius)" }}
        aria-busy="true"
      >
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,var(--theme-surface),var(--theme-bg),var(--theme-surface))]" />
      </div>
    );
  }

  const banner = banners[current];
  if (!banner) return null;

  const bannerLink = resolveBannerLink(banner.link);

  const handleOpenBanner = () => {
    if (!bannerLink) return;
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
      style={{ aspectRatio: "2.34 / 1", borderRadius: bannerStyle === "premium" || bannerStyle === "fresh" ? undefined : "var(--theme-radius)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleOpenBanner}
    >
      {bannerOverlayClass ? <div className={bannerOverlayClass} aria-hidden /> : null}
      {motionEnabled ? (
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={current}
            src={banner.image}
            alt={banner.title || "首页轮播图"}
            width={1200}
            height={512}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "linear" }}
          />
        </AnimatePresence>
      ) : (
        <img
          key={current}
          src={banner.image}
          alt={banner.title || "首页轮播图"}
          width={1200}
          height={512}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goTo(i);
            }}
            className="touch-target flex items-center justify-center p-0.5"
            aria-label={`Banner ${i + 1}`}
          >
            {motionEnabled ? (
              <motion.div
                className="rounded-full"
                animate={{
                  width: i === current ? 18 : 6,
                  height: 6,
                  backgroundColor: i === current ? "var(--theme-primary)" : "rgba(255,255,255,0.55)",
                }}
                transition={{ duration: 0.2 }}
              />
            ) : (
              <span
                className="block rounded-full"
                style={{
                  width: i === current ? 18 : 6,
                  height: 6,
                  backgroundColor: i === current ? "var(--theme-primary)" : "rgba(255,255,255,0.55)",
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
