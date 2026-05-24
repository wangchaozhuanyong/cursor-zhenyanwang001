import { runGuardedDownload } from "@/utils/downloadConfirm";
import { triggerBrowserBlobDownload, triggerBrowserFileDownload } from "@/utils/fileDownload";

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\s]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "image";
}

function guessExtension(url: string, contentType?: string): string {
  if (contentType) {
    const mime = contentType.split(";")[0]?.trim().toLowerCase();
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    if (mime === "image/png") return "png";
    if (mime === "image/svg+xml") return "svg";
  }
  const match = url.split("?")[0]?.match(/\.(jpe?g|png|gif|webp|svg)$/i);
  return match?.[1]?.toLowerCase().replace("jpeg", "jpg") || "png";
}

async function downloadViaFetch(url: string, filename: string): Promise<boolean> {
  const absolute = new URL(url, typeof window !== "undefined" ? window.location.href : url).href;
  const response = await fetch(absolute, { mode: "cors", credentials: "include" });
  if (!response.ok) throw new Error("fetch failed");
  const blob = await response.blob();
  const ext = guessExtension(url, blob.type || response.headers.get("content-type") || undefined);
  const base = filename.replace(/\.[a-z0-9]+$/i, "");
  await triggerBrowserBlobDownload(blob, `${base}.${ext}`);
  return true;
}

async function downloadViaCanvas(url: string, filename: string): Promise<boolean> {
  if (typeof document === "undefined" || typeof Image === "undefined") return false;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) return false;
  ctx.drawImage(image, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/png");
  });
  if (!blob) return false;
  const base = filename.replace(/\.[a-z0-9]+$/i, "");
  await triggerBrowserBlobDownload(blob, `${base}.png`);
  return true;
}

function downloadViaAnchor(url: string, filename: string): boolean {
  if (typeof document === "undefined") return false;
  triggerBrowserFileDownload(url, filename);
  return true;
}

async function performDownloadImage(src: string, filename: string): Promise<boolean> {
  try {
    return await downloadViaFetch(src, filename);
  } catch {
    // Continue to canvas / anchor fallbacks.
  }

  try {
    return await downloadViaCanvas(src, filename);
  } catch {
    // Continue to anchor / open fallbacks.
  }

  try {
    return downloadViaAnchor(src, filename);
  } catch {
    if (typeof window !== "undefined") {
      window.open(src, "_blank", "noopener,noreferrer");
    }
    return false;
  }
}

/** Returns true when a file download was triggered; false when only a fallback open was used or user取消. */
export async function downloadImage(url: string, filenameBase: string): Promise<boolean> {
  const src = url.trim();
  if (!src) return false;

  const safeBase = sanitizeFilename(filenameBase);
  const filename = `${safeBase}.${guessExtension(src)}`;

  let result = false;
  const started = await runGuardedDownload(async () => {
    result = await performDownloadImage(src, filename);
  }, {
    title: "确认下载",
    fileName: filename,
  });
  if (!started) return false;
  return result;
}
