import { useState, useEffect, useCallback, useRef, type KeyboardEvent, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supportsColorMix } from "@/utils/cssSupport";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { BANNER_ASPECT_CSS, BANNER_IMAGE_HEIGHT, BANNER_IMAGE_WIDTH } from "@/constants/bannerAspect";
import { getBannerContainerClassName, getBannerOverlayClassName } from "@/utils/themeVisuals";
import { trackEvent } from "@/services/analyticsService";
import { getBannerCtaText } from "@/utils/bannerCta";
import type { Banner } from "@/types/banner";

interface LoginBannerCarouselProps {
  banners: Banner[];
  paused?: boolean;
}

function resolveBannerLink(link: string | undefined): string {
  return String(link || "").trim();
}

export default function LoginBannerCarousel({ banners, paused = false }: LoginBannerCarouselProps) {
  const { themeConfig } = useThemeRuntime();
  const bannerContainerClass = getBannerContainerClassName(themeConfig.bannerStyle);
  const bannerOverlayClass = getBannerOverlayClassName(themeConfig.bannerStyle);
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(0);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (banners.length > 0 && current >= banners.length) {
      setCurrent(0);
    }
  }, [banners.length, current]);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current],
  );

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [banners.length, paused]);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    suppressClickRef.current = false;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      suppressClickRef.current = true;
      goTo(diff > 0 ? (current + 1) % banners.length : (current - 1 + banners.length) % banners.length);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  if (banners.length === 0) return null;

  const safeCurrent = current >= banners.length ? 0 : current;
  const banner = banners[safeCurrent];
  const bannerTitle = banner.title?.trim() || "";
  const bannerDescription = banner.description?.trim() || "";
  const bannerLink = resolveBannerLink(banner.link);
  const bannerCtaText = getBannerCtaText(banner);
  const hasTextLayer = Boolean(bannerTitle || bannerDescription || bannerCtaText);
  const handleOpenBanner = () => {
    if (suppressClickRef.current) return;
    if (!bannerLink) return;
    void trackEvent({ event_type: "banner_click", module: "login_banner", activity_id: banner.id });
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
  const inactiveDotColor = supportsColorMix() ? "color-mix(in srgb, #ffffff 50%, transparent)" : "rgba(255,255,255,0.5)";
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-[var(--theme-surface)] ${bannerContainerClass} ${bannerLink ? "cursor-pointer" : ""}`}
      style={{ aspectRatio: BANNER_ASPECT_CSS, borderRadius: "var(--theme-radius)" }}
      data-theme-banner-style={themeConfig.bannerStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleOpenBanner}
      onKeyDown={handleKeyDown}
      role={bannerLink ? "button" : undefined}
      tabIndex={bannerLink ? 0 : undefined}
      aria-label={bannerLink ? `打开轮播图：${bannerTitle || `登录页轮播图 ${safeCurrent + 1}`}` : undefined}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={safeCurrent}
          className="absolute inset-0"
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <img
            src={banner.image}
            alt={bannerTitle || `登录页轮播图 ${safeCurrent + 1}`}
            width={BANNER_IMAGE_WIDTH}
            height={BANNER_IMAGE_HEIGHT}
            className={`h-full w-full object-cover ${hasTextLayer ? "store-hero-image-with-copy" : "object-center"}`}
            loading="eager"
            decoding="async"
          />
          {bannerOverlayClass ? (
            <div className={bannerOverlayClass} />
          ) : (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          )}
        </motion.div>
      </AnimatePresence>

      {hasTextLayer ? (
        <>
          {banner.image ? (
            <div className="store-hero-story-layer pointer-events-none absolute inset-y-0 left-0 z-10" aria-hidden>
              <img src={banner.image} alt="" className="store-hero-story-image" loading="eager" decoding="async" />
              <div className="store-hero-story-tint" />
            </div>
          ) : null}
          <div className="store-hero-text-wash pointer-events-none absolute inset-0 z-10" aria-hidden />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-full items-center px-3 py-2.5">
            <motion.div
              key={`login-copy-${banner.id || safeCurrent}`}
              className="store-hero-copy-panel login-banner-copy-panel"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            >
              {bannerTitle ? (
                <h2 className="store-hero-copy-title login-banner-copy-title line-clamp-2 text-[15px] font-bold leading-tight text-[var(--theme-text-on-surface)]">
                  {bannerTitle}
                </h2>
              ) : null}
              {bannerDescription ? (
                <p className="store-hero-copy-desc login-banner-copy-desc mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--theme-text-muted-on-surface)]">
                  {bannerDescription}
                </p>
              ) : null}
              {bannerCtaText ? (
                <button
                  type="button"
                  className="store-hero-copy-cta pointer-events-auto mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenBanner();
                  }}
                >
                  <span className="truncate">{bannerCtaText}</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              ) : null}
            </motion.div>
          </div>
        </>
      ) : null}

      {banners.length > 1 && (
        <div
          className="absolute bottom-2 right-2 z-30 flex min-h-8 rounded-full border border-white/35 bg-black/28 px-1.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              className="flex h-8 min-w-8 items-center justify-center rounded-full px-1 transition-transform active:scale-95"
              aria-label={`Banner ${i + 1}`}
              aria-current={i === safeCurrent ? "true" : undefined}
            >
              <span
                className="block h-[5px] rounded-full transition-[width,background-color] duration-300 ease-out"
                style={{
                  width: i === safeCurrent ? 14 : 5,
                  backgroundColor: i === safeCurrent ? "var(--theme-price)" : inactiveDotColor,
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
