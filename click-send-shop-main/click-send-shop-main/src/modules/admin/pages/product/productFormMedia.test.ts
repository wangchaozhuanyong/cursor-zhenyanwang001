import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_UPLOAD_MAX_BYTES,
  PRODUCT_VIDEO_UPLOAD_MAX_BYTES,
  readRequiredProductUploadUrl,
  validateProductImageUploadFile,
  validateProductVideoUploadFile,
} from "@/modules/admin/pages/product/productFormMedia";

describe("productFormMedia", () => {
  it("accepts product images and marks GIF files for a warning", () => {
    expect(validateProductImageUploadFile({ type: "image/webp", size: 1024 })).toEqual({
      shouldWarnAboutGif: false,
    });
    expect(validateProductImageUploadFile({ type: "image/gif", size: 1024 })).toEqual({
      shouldWarnAboutGif: true,
    });
  });

  it("rejects unsupported or oversized product media files", () => {
    expect(() => validateProductImageUploadFile({ type: "image/svg+xml", size: 1024 })).toThrow("仅支持");
    expect(() =>
      validateProductImageUploadFile({ type: "image/png", size: PRODUCT_IMAGE_UPLOAD_MAX_BYTES + 1 }),
    ).toThrow("15MB");
    expect(() => validateProductVideoUploadFile({ type: "video/avi", size: 1024 })).toThrow("视频仅支持");
    expect(() =>
      validateProductVideoUploadFile({ type: "video/mp4", size: PRODUCT_VIDEO_UPLOAD_MAX_BYTES + 1 }),
    ).toThrow("50MB");
  });

  it("normalizes required upload urls from the upload service response", () => {
    expect(readRequiredProductUploadUrl({ url: " https://example.com/a.jpg " }, "图片")).toBe(
      "https://example.com/a.jpg",
    );
    expect(() => readRequiredProductUploadUrl({ url: "" }, "视频")).toThrow("服务器未返回视频地址");
  });
});
