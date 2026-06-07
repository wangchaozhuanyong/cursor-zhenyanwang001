import { describe, expect, it } from "vitest";
import { resolveNavIconThumbUrl, shouldUseNavIconThumbProxy } from "./navIconThumbUrl";

describe("nav icon thumb url", () => {
  it("uses the thumbnail proxy only for upload image URLs", () => {
    expect(shouldUseNavIconThumbProxy("/uploads/a.webp")).toBe(true);
    expect(shouldUseNavIconThumbProxy("https://cdn.damatong.net/prod/uploads/a.webp")).toBe(false);
    expect(shouldUseNavIconThumbProxy("grid")).toBe(false);
    expect(shouldUseNavIconThumbProxy("data:image/webp;base64,abc")).toBe(false);
  });

  it("builds a media thumbnail API URL for local upload paths", () => {
    const result = resolveNavIconThumbUrl("/uploads/a.webp");
    expect(result).toContain("/media/nav-icon-thumb?src=");
    expect(decodeURIComponent(result)).toContain("/uploads/a.webp");
  });

  it("leaves remote CDN images unchanged so nav icons can fall back without API proxy errors", () => {
    const src = "https://cdn.damatong.net/prod/uploads/a.webp";
    expect(resolveNavIconThumbUrl(src)).toBe(src);
  });

  it("leaves token icons unchanged", () => {
    expect(resolveNavIconThumbUrl("coupon")).toBe("coupon");
  });
});
