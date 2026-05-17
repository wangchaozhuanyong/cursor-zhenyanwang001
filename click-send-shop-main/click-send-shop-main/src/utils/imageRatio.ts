export async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
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
