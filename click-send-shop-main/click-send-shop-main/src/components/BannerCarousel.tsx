import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Banner } from "@/types/banner";
import { supportsColorMix } from "@/utils/cssSupport";

interface BannerCarouselProps {
  banners: Banner[];
}

function resolveBannerLink(link: string): string {
  const value = (link || "").trim();
  if (!value) return "";
  return value;
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current],
  );

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

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

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  if (banners.length === 0) return null;

  const banner = banners[current];
  if (!banner) return null;

  const inactiveDotColor = supportsColorMix() ? "color-mix(in srgb, #ffffff 50%, transparent)" : "rgba(255,255,255,0.5)";
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
      className="relative overflow-hidden rounded-[1.35rem] theme-shadow"
      style={{ aspectRatio: "2.34 / 1" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={current}
          src={banner.image}
          alt={banner.title}
          width={1200}
          height={512}
          className="absolute inset-0 h-full w-full object-cover"
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="absolute inset-0 flex items-end justify-between p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="max-w-[70%]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">精选推荐</p>
            <p className="mt-1 font-display text-2xl font-bold leading-tight text-white">{banner.title || "品质好物，安心下单"}</p>
            <p className="mt-1 text-xs text-white/80">本地配送 · 会员优惠 · 售后保障</p>
          </motion.div>
        </AnimatePresence>

        {bannerLink ? (
          <button
            type="button"
            onClick={handleOpenBanner}
            className="mb-1 inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
          >
            立即查看
            <ChevronRight size={14} />
          </button>
        ) : null}
      </div>

      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className="touch-target flex items-center justify-center p-0.5"
            aria-label={`Banner ${i + 1}`}
          >
            <motion.div
              className="rounded-full"
              animate={{
                width: i === current ? 18 : 6,
                height: 6,
                backgroundColor: i === current ? "var(--theme-price)" : inactiveDotColor,
              }}
              transition={{ duration: 0.3 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
