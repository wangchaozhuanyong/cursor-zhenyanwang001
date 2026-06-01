import { useState, useEffect, useCallback, useRef, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supportsColorMix } from "@/utils/cssSupport";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { BANNER_ASPECT_CSS, BANNER_IMAGE_HEIGHT, BANNER_IMAGE_WIDTH } from "@/constants/bannerAspect";
import { getBannerContainerClassName, getBannerOverlayClassName } from "@/utils/themeVisuals";

interface LoginBanner {
  image: string;
  title: string;
  link?: string;
}

interface LoginBannerCarouselProps {
  banners: LoginBanner[];
  paused?: boolean;
}

export default function LoginBannerCarousel({ banners, paused = false }: LoginBannerCarouselProps) {
  const { themeConfig } = useThemeRuntime();
  const bannerContainerClass = getBannerContainerClassName(themeConfig.bannerStyle);
  const bannerOverlayClass = getBannerOverlayClassName(themeConfig.bannerStyle);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(0);

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
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? (current + 1) % banners.length : (current - 1 + banners.length) % banners.length);
    }
  };

  if (banners.length === 0) return null;

  const safeCurrent = current >= banners.length ? 0 : current;
  const inactiveDotColor = supportsColorMix() ? "color-mix(in srgb, #ffffff 50%, transparent)" : "rgba(255,255,255,0.5)";
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-[var(--theme-surface)] ${bannerContainerClass}`}
      style={{ aspectRatio: BANNER_ASPECT_CSS, borderRadius: "var(--theme-radius)" }}
      data-theme-banner-style={themeConfig.bannerStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
            src={banners[safeCurrent].image}
            alt={banners[safeCurrent].title}
            width={BANNER_IMAGE_WIDTH}
            height={BANNER_IMAGE_HEIGHT}
            className="h-full w-full object-cover object-center"
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

      {banners.length > 1 && (
        <div className="absolute bottom-2 right-2 flex min-h-8 rounded-full border border-white/35 bg-black/28 px-1.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-sm">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
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
