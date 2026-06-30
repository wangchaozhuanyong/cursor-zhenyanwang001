import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RatioImage from "@/components/client/RatioImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { getProductFallbackImage } from "@/utils/productFallbackImage";
import { productCoverForDetail } from "@/utils/uploadImageVariant";

interface ProductImageGalleryProps {
  images: string[];
  imageAlts?: string[];
  name: string;
  videoUrl?: string;
  /** 图集上方悬浮层（返回、分享等） */
  overlay?: React.ReactNode;
}

type GalleryItem = { type: "image" | "video"; url: string; alt?: string };

export default function ProductImageGallery({ images, imageAlts, name, videoUrl, overlay }: ProductImageGalleryProps) {
  const safeImages = Array.isArray(images) && images.length ? images : [];
  const media: GalleryItem[] = [
    ...(videoUrl ? [{ type: "video" as const, url: videoUrl }] : []),
    ...safeImages.map((url, index) => ({ type: "image" as const, url, alt: imageAlts?.[index] })),
  ];
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const currentItem = media[current];
  const fallbackImage = getProductFallbackImage(name);

  useEffect(() => {
    if (current >= media.length) setCurrent(Math.max(0, media.length - 1));
  }, [current, media.length]);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < media.length - 1) goTo(current + 1);
      else if (diff < 0 && current > 0) goTo(current - 1);
    }
  };

  if (media.length === 0) {
    return (
      <div className="sf-next-product-gallery-inner relative">
        <div className="sf-next-product-gallery-stage relative w-full overflow-hidden bg-secondary" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}>
          <RatioImage
            src={fallbackImage}
            alt={`${name} 商品图`}
            ratio="1 / 1"
            rounded="none"
            className="h-full w-full bg-transparent"
            imgClassName="h-full w-full [object-fit:var(--theme-image-fit,cover)]"
            sizes="100vw"
            fetchPriority="high"
          />
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <div className="sf-next-product-gallery-inner relative">
      <div
        className="sf-next-product-gallery-stage relative w-full overflow-hidden bg-secondary"
        style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={`${currentItem.type}-${currentItem.url}`}
            className="sf-next-product-gallery-frame absolute inset-0 h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentItem.type === "video" ? (
              <video
                src={currentItem.url}
                className="h-full w-full bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                aria-label={`${name} 视频`}
              />
            ) : (
              <RatioImage
                src={productCoverForDetail(currentItem.url)}
                fallbackSrc={fallbackImage}
                alt={currentItem.alt || (current === 0 ? `${name} 主图` : `${name} 详情图 ${current + 1}`)}
                ratio="1 / 1"
                rounded="none"
                className="h-full w-full bg-transparent"
                imgClassName="h-full w-full [object-fit:var(--theme-image-fit,cover)]"
                sizes="100vw"
                {...(current === 0 ? { fetchPriority: "high" as const } : {})}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="sf-next-product-gallery-count pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[color-mix(in_srgb,var(--theme-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[var(--theme-text-on-surface)] shadow-sm backdrop-blur-sm">
          {current + 1} / {media.length}
        </div>
      </div>

      {overlay}
    </div>
  );
}
