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

function triggerBlobDownload(blob: Blob, filename: string): boolean {
  if (typeof document === "undefined") return false;
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
  return true;
}

async function downloadViaFetch(url: string, filename: string): Promise<boolean> {
  const absolute = new URL(url, typeof window !== "undefined" ? window.location.href : url).href;
  const response = await fetch(absolute, { mode: "cors", credentials: "include" });
  if (!response.ok) throw new Error("fetch failed");
  const blob = await response.blob();
  const ext = guessExtension(url, blob.type || response.headers.get("content-type") || undefined);
  const base = filename.replace(/\.[a-z0-9]+$/i, "");
  return triggerBlobDownload(blob, `${base}.${ext}`);
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
  return triggerBlobDownload(blob, `${base}.png`);
}

function downloadViaAnchor(url: string, filename: string): boolean {
  if (typeof document === "undefined") return false;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}

/** Returns true when a file download was triggered; false when only a fallback open was used. */
export async function downloadImage(url: string, filenameBase: string): Promise<boolean> {
  const src = url.trim();
  if (!src) return false;

  const safeBase = sanitizeFilename(filenameBase);
  const filename = `${safeBase}.${guessExtension(src)}`;

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
