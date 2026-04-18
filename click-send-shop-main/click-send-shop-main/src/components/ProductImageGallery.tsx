import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductImageGalleryProps {
  images: string[];
  name: string;
}

export default function ProductImageGallery({ images, name }: ProductImageGalleryProps) {
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

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < images.length - 1) goTo(current + 1);
      else if (diff < 0 && current > 0) goTo(current - 1);
    }
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="relative">
      {/* Main image */}
      <div
        className="relative aspect-square w-full overflow-hidden bg-secondary"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img
            key={current}
            src={images[current]}
            alt={`${name} ${current + 1}`}
            className="absolute inset-0 h-full w-full object-cover"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </AnimatePresence>

        {/* Counter */}
        <div className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-1 text-[11px] font-medium text-background backdrop-blur-sm">
          {current + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`flex-shrink-0 overflow-hidden rounded-lg transition-all ${
              i === current
                ? "ring-2 ring-gold ring-offset-2 ring-offset-background"
                : "opacity-50 hover:opacity-80"
            }`}
          >
            <img src={img} alt={`${name} thumb ${i + 1}`} className="h-14 w-14 object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
