export type BannerCopyTone = "light" | "dark";

const DEFAULT_COPY_TONE: BannerCopyTone = "light";
const SAMPLE_WIDTH = 72;
const MIN_SAMPLE_HEIGHT = 24;
const MAX_SAMPLE_HEIGHT = 64;

type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function relativeLuminance(r: number, g: number, b: number) {
  const toLinear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getBannerCopyToneFromLuminance(averageLuminance: number, brightPixelShare = 0): BannerCopyTone {
  if (averageLuminance >= 0.62) return "dark";
  if (averageLuminance >= 0.52 && brightPixelShare >= 0.58) return "dark";
  return "light";
}

export function getBannerCopyToneFromPixels(data: Uint8ClampedArray): BannerCopyTone {
  let total = 0;
  let sampled = 0;
  let bright = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 16) continue;
    const luminance = relativeLuminance(data[index], data[index + 1], data[index + 2]);
    total += luminance;
    sampled += 1;
    if (luminance >= 0.58) bright += 1;
  }

  if (sampled === 0) return DEFAULT_COPY_TONE;
  return getBannerCopyToneFromLuminance(total / sampled, bright / sampled);
}

function parsePositionToken(token: string | undefined, axis: "x" | "y") {
  if (!token) return 0.5;
  const normalized = token.trim().toLowerCase();
  if (normalized.endsWith("%")) {
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? clamp(value / 100, 0, 1) : 0.5;
  }
  if (axis === "x") {
    if (normalized === "left") return 0;
    if (normalized === "right") return 1;
  } else {
    if (normalized === "top") return 0;
    if (normalized === "bottom") return 1;
  }
  if (normalized === "center") return 0.5;
  return 0.5;
}

function parseObjectPosition(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const token = parts[0];
    if (token === "left" || token === "right" || token.endsWith("%")) {
      return { x: parsePositionToken(token, "x"), y: 0.5 };
    }
    if (token === "top" || token === "bottom") {
      return { x: 0.5, y: parsePositionToken(token, "y") };
    }
  }
  return {
    x: parsePositionToken(parts[0], "x"),
    y: parsePositionToken(parts[1], "y"),
  };
}

function intersectRect(a: RectLike, b: RectLike): RectLike | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { left, top, right, bottom, width, height };
}

function fallbackTextRegion(imageRect: RectLike): RectLike {
  const width = imageRect.width * 0.58;
  return {
    left: imageRect.left,
    top: imageRect.top + imageRect.height * 0.16,
    right: imageRect.left + width,
    bottom: imageRect.bottom - imageRect.height * 0.12,
    width,
    height: imageRect.height * 0.72,
  };
}

export function getBannerCopyToneFromImage(
  image: HTMLImageElement | null,
  copyPanel: HTMLElement | null,
  fallback: BannerCopyTone = DEFAULT_COPY_TONE,
): BannerCopyTone {
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) return fallback;

  try {
    const imageRect = image.getBoundingClientRect();
    if (imageRect.width <= 0 || imageRect.height <= 0) return fallback;

    const panelRect = copyPanel?.getBoundingClientRect();
    const targetRegion = panelRect && panelRect.width > 0 && panelRect.height > 0
      ? intersectRect(panelRect, imageRect) ?? fallbackTextRegion(imageRect)
      : fallbackTextRegion(imageRect);

    const scale = Math.max(imageRect.width / image.naturalWidth, imageRect.height / image.naturalHeight);
    if (!Number.isFinite(scale) || scale <= 0) return fallback;

    const { x: positionX, y: positionY } = parseObjectPosition(getComputedStyle(image).objectPosition || "50% 50%");
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const offsetX = (imageRect.width - renderedWidth) * positionX;
    const offsetY = (imageRect.height - renderedHeight) * positionY;

    const sourceX = clamp((targetRegion.left - imageRect.left - offsetX) / scale, 0, image.naturalWidth);
    const sourceY = clamp((targetRegion.top - imageRect.top - offsetY) / scale, 0, image.naturalHeight);
    const sourceWidth = clamp(targetRegion.width / scale, 1, image.naturalWidth - sourceX);
    const sourceHeight = clamp(targetRegion.height / scale, 1, image.naturalHeight - sourceY);
    const sampleHeight = clamp(Math.round((targetRegion.height / Math.max(targetRegion.width, 1)) * SAMPLE_WIDTH), MIN_SAMPLE_HEIGHT, MAX_SAMPLE_HEIGHT);

    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_WIDTH;
    canvas.height = sampleHeight;
    const context = canvas.getContext("2d");
    if (!context) return fallback;

    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, SAMPLE_WIDTH, sampleHeight);
    return getBannerCopyToneFromPixels(context.getImageData(0, 0, SAMPLE_WIDTH, sampleHeight).data);
  } catch {
    return fallback;
  }
}
