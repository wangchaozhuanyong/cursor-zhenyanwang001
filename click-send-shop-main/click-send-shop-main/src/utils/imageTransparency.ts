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

export async function hasTransparentPixels(file: File): Promise<boolean> {
  if (!supportsTransparencyByMime(file.type)) return false;
  const img = await loadImageElement(file);
  const width = Math.max(1, Math.floor(img.naturalWidth || img.width || 0));
  const height = Math.max(1, Math.floor(img.naturalHeight || img.height || 0));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}
