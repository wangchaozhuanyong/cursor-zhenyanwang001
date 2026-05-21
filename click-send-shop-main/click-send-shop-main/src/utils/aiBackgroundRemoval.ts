/**
 * Browser AI matting via @imgly/background-removal (AGPL-3.0).
 * Dynamically imported so admin bundles stay lean until first use.
 */

import type { Config } from "@imgly/background-removal";

const AI_MAX_SIDE = 512;

export type AiMatteProgress = (message: string, fraction?: number) => void;

let removeBackgroundLoader: Promise<typeof import("@imgly/background-removal").default> | null = null;

function loadRemoveBackground() {
  if (!removeBackgroundLoader) {
    removeBackgroundLoader = import("@imgly/background-removal").then((mod) => mod.default);
  }
  return removeBackgroundLoader;
}

async function rasterizeToBlob(file: File, maxSide: number): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = objectUrl;
    });
    const srcW = Math.max(1, Math.floor(img.naturalWidth || img.width || 0));
    const srcH = Math.max(1, Math.floor(img.naturalHeight || img.height || 0));
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
        "image/png",
      );
    });
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function blobToPngFile(blob: Blob, originalName: string): File {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "icon";
  return new File([blob], `${baseName}.png`, { type: "image/png", lastModified: Date.now() });
}

/** AI background removal; first run downloads ~40MB model assets into browser cache. */
export async function removeBackgroundWithAi(file: File, onProgress?: AiMatteProgress): Promise<File> {
  const removeBackground = await loadRemoveBackground();
  onProgress?.("正在加载 AI 抠图模型…", 0);
  const inputBlob = await rasterizeToBlob(file, AI_MAX_SIDE);
  const config: Config = {
    model: "isnet_quint8",
    output: {
      format: "image/png",
      quality: 1,
      type: "foreground",
    },
    progress: (key, current, total) => {
      if (!total) {
        onProgress?.(`正在下载 ${key}…`);
        return;
      }
      onProgress?.(`正在下载 ${key}…`, Math.min(0.95, current / total));
    },
  };
  onProgress?.("AI 抠图中…", 0.96);
  const resultBlob = await removeBackground(inputBlob, config);
  onProgress?.("抠图完成", 1);
  return blobToPngFile(resultBlob, file.name);
}
