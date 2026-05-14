export type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: "image/webp" | "image/jpeg";
};

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  outputType: "image/webp",
};

function shouldSkipCompression(file: File) {
  return file.size <= 300 * 1024 || file.type === "image/gif" || file.type === "image/svg+xml";
}

export async function compressImageBeforeUpload(
  file: File,
  options: CompressImageOptions = {},
): Promise<{ file: File; compressed: boolean }> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  if (!file.type.startsWith("image/") || shouldSkipCompression(file)) {
    return { file, compressed: false };
  }

  const imageBitmap = await createImageBitmap(file);
  const ratio = Math.min(
    1,
    config.maxWidth / imageBitmap.width,
    config.maxHeight / imageBitmap.height,
  );
  if (ratio >= 1 && file.size <= 900 * 1024) {
    imageBitmap.close();
    return { file, compressed: false };
  }

  const targetWidth = Math.max(1, Math.round(imageBitmap.width * ratio));
  const targetHeight = Math.max(1, Math.round(imageBitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    imageBitmap.close();
    return { file, compressed: false };
  }

  context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  imageBitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, config.outputType, config.quality),
  );
  if (!blob || blob.size >= file.size) {
    return { file, compressed: false };
  }

  const ext = config.outputType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const nextFile = new File([blob], `${baseName}.${ext}`, {
    type: config.outputType,
    lastModified: Date.now(),
  });
  return { file: nextFile, compressed: true };
}
