import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginBanner {
  image: string;
  title: string;
  link?: string;
}

interface LoginBannerCarouselProps {
  banners: LoginBanner[];
}

export default function LoginBannerCarousel({ banners }: LoginBannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [touchStart, setTouchStart] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? (current + 1) % banners.length : (current - 1 + banners.length) % banners.length);
    }
  };

  if (banners.length === 0) return null;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-secondary"
      style={{ aspectRatio: "16 / 7" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          className="absolute inset-0"
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <img
            src={banners[current].image}
            alt={banners[current].title}
            className="h-full w-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Title */}
          {banners[current].title && (
            <div className="absolute bottom-3 left-4 right-12">
              <p className="text-sm font-semibold text-white drop-shadow-md">{banners[current].title}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-2.5 right-3 flex gap-1">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="touch-target flex items-center justify-center p-0.5"
            >
              <motion.div
                className="rounded-full"
                animate={{
                  width: i === current ? 14 : 5,
                  height: 5,
                  backgroundColor: i === current ? "var(--theme-price)" : "color-mix(in srgb, #ffffff 50%, transparent)",
                }}
                transition={{ duration: 0.3 }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
