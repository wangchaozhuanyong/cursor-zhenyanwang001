const loadedImages = new Set<string>();

function getImageCacheKeys(...values: Array<string | undefined | null>): string[] {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim().split(/\s+/)[0])
    .filter(Boolean);
}

export function hasLoadedImage(...values: Array<string | undefined | null>): boolean {
  return getImageCacheKeys(...values).some((value) => loadedImages.has(value));
}

export function markImageLoaded(...values: Array<string | undefined | null>) {
  getImageCacheKeys(...values).forEach((value) => loadedImages.add(value));
}

export function rememberLoadedImageFromElement(
  image: HTMLImageElement,
  ...aliases: Array<string | undefined | null>
) {
  if (!image.complete || image.naturalWidth <= 0) return false;
  markImageLoaded(...aliases, image.currentSrc, image.src);
  return true;
}
