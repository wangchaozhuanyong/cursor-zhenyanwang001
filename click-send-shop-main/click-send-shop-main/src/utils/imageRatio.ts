export async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width || 0, height: bitmap.height || 0 };
      bitmap.close();
      if (size.width > 0 && size.height > 0) return size;
    } catch {
      // Fall back to object URL image decoding below.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("读取图片尺寸失败"));
      img.src = objectUrl;
    });
    return { width: image.naturalWidth || 0, height: image.naturalHeight || 0 };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function isAspectRatioWithinTolerance(
  width: number,
  height: number,
  targetRatio: number,
  tolerance = 0.03
): boolean {
  if (width <= 0 || height <= 0) return false;
  const ratio = width / height;
  return Math.abs(ratio - targetRatio) <= tolerance;
}
