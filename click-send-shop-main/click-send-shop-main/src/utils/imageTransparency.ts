import { removeBackgroundWithAi, type AiMatteProgress } from "@/utils/aiBackgroundRemoval";

const BG_COLOR_TOLERANCE = 20;
const MAX_BG_CLUSTERS = 4;

type Rgb = [number, number, number];

export type IconMatteMethod = "none" | "ai" | "edge";

export type EnsureTransparentIconOptions = {
  onProgress?: AiMatteProgress;
};

function supportsTransparencyByMime(type: string): boolean {
  const mime = String(type || "").toLowerCase();
  return mime === "image/png" || mime === "image/webp" || mime === "image/gif";
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = objectUrl;
    });
    return img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function rasterizeFileToImageData(file: File): Promise<ImageData | null> {
  const img = await loadImageElement(file);
  const width = Math.max(1, Math.floor(img.naturalWidth || img.width || 0));
  const height = Math.max(1, Math.floor(img.naturalHeight || img.height || 0));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function maxChannelDelta(a: Rgb, b: Rgb): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function matchesAnyBackground(rgb: Rgb, palette: Rgb[]): boolean {
  return palette.some((bg) => maxChannelDelta(rgb, bg) <= BG_COLOR_TOLERANCE);
}

/** Exported for unit tests — clusters similar colors along the image border. */
export function clusterBorderBackgroundColors(data: Uint8ClampedArray, width: number, height: number): Rgb[] {
  const clusters: Array<{ center: Rgb; count: number }> = [];
  const addPixel = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const rgb: Rgb = [data[i], data[i + 1], data[i + 2]];
    for (const cluster of clusters) {
      if (maxChannelDelta(rgb, cluster.center) <= BG_COLOR_TOLERANCE) {
        cluster.count += 1;
        return;
      }
    }
    clusters.push({ center: rgb, count: 1 });
  };

  for (let x = 0; x < width; x += 1) {
    addPixel(x, 0);
    addPixel(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    addPixel(0, y);
    addPixel(width - 1, y);
  }

  clusters.sort((a, b) => b.count - a.count);
  return clusters.slice(0, MAX_BG_CLUSTERS).map((c) => c.center);
}

function floodRemoveConnectedBackground(data: Uint8ClampedArray, width: number, height: number, palette: Rgb[]): boolean {
  if (!palette.length) return false;

  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const rgb: Rgb = [data[i], data[i + 1], data[i + 2]];
    if (!matchesAnyBackground(rgb, palette)) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < width; x += 1) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  let removed = false;
  while (head < tail) {
    const idx = queue[head++];
    const i = idx * 4;
    if (data[i + 3] !== 0) {
      data[i + 3] = 0;
      removed = true;
    }
    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0) tryEnqueue(x - 1, y);
    if (x < width - 1) tryEnqueue(x + 1, y);
    if (y > 0) tryEnqueue(x, y - 1);
    if (y < height - 1) tryEnqueue(x, y + 1);
  }
  return removed;
}

function imageDataToPngFile(imageData: ImageData, originalName: string): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas unavailable"));
  ctx.putImageData(imageData, 0, 0);
  const baseName = originalName.replace(/\.[^.]+$/, "") || "icon";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode PNG"));
          return;
        }
        resolve(new File([blob], `${baseName}.png`, { type: "image/png", lastModified: Date.now() }));
      },
      "image/png",
    );
  });
}

export async function hasTransparentPixels(file: File): Promise<boolean> {
  if (!supportsTransparencyByMime(file.type)) return false;
  const imageData = await rasterizeFileToImageData(file);
  if (!imageData) return false;
  const { data } = imageData;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

/** Fast edge-connected matte for solid / checkerboard backgrounds. */
export async function removeConnectedBackground(file: File): Promise<File> {
  const imageData = await rasterizeFileToImageData(file);
  if (!imageData) throw new Error("无法读取图片");
  const { width, height } = imageData;
  const palette = clusterBorderBackgroundColors(imageData.data, width, height);
  const removed = floodRemoveConnectedBackground(imageData.data, width, height, palette);
  if (!removed) throw new Error("未检测到可去除的连通背景");
  return imageDataToPngFile(imageData, file.name);
}

async function matteWithAiThenEdge(
  file: File,
  onProgress?: AiMatteProgress,
): Promise<{ file: File; method: IconMatteMethod }> {
  try {
    const aiFile = await removeBackgroundWithAi(file, onProgress);
    if (await hasTransparentPixels(aiFile)) {
      return { file: aiFile, method: "ai" };
    }
  } catch {
    onProgress?.("AI 抠图不可用，改用快速去底…");
  }

  const edgeFile = await removeConnectedBackground(file);
  if (!(await hasTransparentPixels(edgeFile))) {
    throw new Error("无法自动去除背景，请上传透明 PNG/WebP，或在设计软件中删除背景后重试。");
  }
  return { file: edgeFile, method: "edge" };
}

/**
 * Ensures an icon file has transparency before upload.
 * Uses AI matting first, then edge-connected removal as fallback.
 */
export async function ensureTransparentIconFile(
  file: File,
  options?: EnsureTransparentIconOptions,
): Promise<{ file: File; autoMatted: boolean; method: IconMatteMethod }> {
  if (await hasTransparentPixels(file)) {
    return { file, autoMatted: false, method: "none" };
  }
  const { file: matted, method } = await matteWithAiThenEdge(file, options?.onProgress);
  return { file: matted, autoMatted: true, method };
}
