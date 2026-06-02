type UploadFileLike = Pick<File, "type" | "size">;

export const PRODUCT_IMAGE_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const PRODUCT_VIDEO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

const PRODUCT_IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const PRODUCT_VIDEO_UPLOAD_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

export function validateProductImageUploadFile(file: UploadFileLike) {
  const type = file.type.toLowerCase();
  if (!PRODUCT_IMAGE_UPLOAD_TYPES.includes(type)) {
    throw new Error("仅支持 JPG、PNG、WebP、GIF 图片");
  }
  if (file.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error("图片大小不能超过 15MB");
  }
  return {
    shouldWarnAboutGif: type === "image/gif",
  };
}

export function validateProductVideoUploadFile(file: UploadFileLike) {
  const type = file.type.toLowerCase();
  if (!PRODUCT_VIDEO_UPLOAD_TYPES.includes(type)) {
    throw new Error("视频仅支持 MP4、WebM、MOV 格式");
  }
  if (file.size > PRODUCT_VIDEO_UPLOAD_MAX_BYTES) {
    throw new Error("视频大小不能超过 50MB");
  }
}

export function readRequiredProductUploadUrl(result: { url?: string | null }, assetLabel: "图片" | "视频") {
  const url = String(result.url || "").trim();
  if (!url) {
    throw new Error(`服务器未返回${assetLabel}地址，请检查存储配置或稍后重试`);
  }
  return url;
}
