import { useState } from "react";
import { ImageOff } from "lucide-react";

const failedSrcCache = new Set<string>();

type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
};

export default function SafeImage({
  src,
  alt,
  className,
  placeholderClassName,
}: SafeImageProps) {
  const normalizedSrc = String(src || "").trim();
  const [failed, setFailed] = useState(() => !normalizedSrc || failedSrcCache.has(normalizedSrc));

  if (!normalizedSrc || failed) {
    return (
      <div
        aria-hidden={!alt}
        className={`flex items-center justify-center ${placeholderClassName || className || "bg-secondary"}`}
      >
        <ImageOff size={16} className="opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        failedSrcCache.add(normalizedSrc);
        setFailed(true);
      }}
    />
  );
}
