import { hasLoadedImage, markImageLoaded as rememberImageLoaded } from "@/utils/imageLoadMemory";

const loadingPromises = new Map<string, Promise<void>>();

export function hasImageLoaded(src: string | null | undefined) {
  return Boolean(src && hasLoadedImage(src));
}

export function markImageLoaded(src: string | null | undefined) {
  if (src) rememberImageLoaded(src);
}

export function preloadImage(src: string | null | undefined) {
  const value = String(src || "").trim();
  if (!value) return Promise.resolve();
  if (hasLoadedImage(value)) return Promise.resolve();
  if (typeof window === "undefined" || typeof Image === "undefined") return Promise.resolve();

  const existing = loadingPromises.get(value);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();

    image.onload = async () => {
      try {
        if ("decode" in image) await image.decode();
      } catch {
        // Decode failures should not block a successfully loaded image.
      }

      rememberImageLoaded(value, image.currentSrc, image.src);
      loadingPromises.delete(value);
      resolve();
    };

    image.onerror = () => {
      loadingPromises.delete(value);
      reject(new Error(`Failed to preload image: ${value}`));
    };

    image.decoding = "async";
    image.src = value;
  });

  loadingPromises.set(value, promise);
  return promise;
}

export function preloadImages(srcList: Array<string | null | undefined>) {
  return Promise.allSettled(srcList.filter(Boolean).map((src) => preloadImage(src)));
}
