import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RatioImage from "@/components/client/RatioImage";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
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
  const lastIndex = Math.max(0, media.length - 1);
  const safeCurrent = Math.min(current, lastIndex);
  const currentItem = media[safeCurrent];
  const hasMultipleMedia = media.length > 1;

  useEffect(() => {
    if (current !== safeCurrent) setCurrent(safeCurrent);
  }, [current, safeCurrent]);

  const goTo = useCallback((index: number) => {
    setCurrent(Math.max(0, Math.min(index, lastIndex)));
  }, [lastIndex]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && safeCurrent < lastIndex) goTo(safeCurrent + 1);
      else if (diff < 0 && safeCurrent > 0) goTo(safeCurrent - 1);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultipleMedia || event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(safeCurrent - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(safeCurrent + 1);
    }
  };

  if (media.length === 0) {
    return (
      <div className="sf-next-product-gallery-inner relative">
        <div className="sf-next-product-gallery-stage relative w-full overflow-hidden bg-secondary" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}>
          <RatioImage
            src=""
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
        onKeyDown={handleKeyDown}
        role={hasMultipleMedia ? "region" : undefined}
        aria-label={hasMultipleMedia ? `${name} 商品媒体，共 ${media.length} 项，可使用左右方向键切换` : undefined}
        tabIndex={hasMultipleMedia ? 0 : undefined}
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
                className="h-full w-full bg-[var(--sf-graphite)] object-contain"
                controls
                playsInline
                preload="metadata"
                aria-label={`${name} 视频`}
              />
            ) : (
              <RatioImage
                src={productCoverForDetail(currentItem.url)}
                alt={currentItem.alt || (safeCurrent === 0 ? `${name} 主图` : `${name} 详情图 ${safeCurrent + 1}`)}
                ratio="1 / 1"
                rounded="none"
                className="h-full w-full bg-transparent"
                imgClassName="h-full w-full [object-fit:var(--theme-image-fit,cover)]"
                sizes="100vw"
                {...(safeCurrent === 0 ? { fetchPriority: "high" as const } : {})}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {hasMultipleMedia ? (
          <div className="sf-next-product-gallery-controls" role="group" aria-label="商品媒体切换">
            <UnifiedButton
              type="button"
              className="sf-next-product-gallery-nav sf-next-product-gallery-nav--previous"
              onClick={() => goTo(safeCurrent - 1)}
              disabled={safeCurrent === 0}
              aria-label="上一张商品媒体"
            >
              <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
            </UnifiedButton>
            <UnifiedButton
              type="button"
              className="sf-next-product-gallery-nav sf-next-product-gallery-nav--next"
              onClick={() => goTo(safeCurrent + 1)}
              disabled={safeCurrent === lastIndex}
              aria-label="下一张商品媒体"
            >
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
            </UnifiedButton>
          </div>
        ) : null}

        {hasMultipleMedia ? (
          <div className="sf-next-product-gallery-count" aria-live="polite" aria-atomic="true">
            {safeCurrent + 1} / {media.length}
          </div>
        ) : null}
      </div>

      {overlay}
    </div>
  );
}
