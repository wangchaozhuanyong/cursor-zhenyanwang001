import { describe, expect, it } from "vitest";
import { resolveNavIconThumbUrl, shouldUseNavIconThumbProxy } from "./navIconThumbUrl";

describe("nav icon thumb url", () => {
  it("uses the thumbnail proxy only for upload image URLs", () => {
    expect(shouldUseNavIconThumbProxy("/uploads/a.webp")).toBe(true);
    expect(shouldUseNavIconThumbProxy("https://cdn.damatong.net/prod/uploads/a.webp")).toBe(true);
    expect(shouldUseNavIconThumbProxy("grid")).toBe(false);
    expect(shouldUseNavIconThumbProxy("data:image/webp;base64,abc")).toBe(false);
  });

  it("builds a media thumbnail API URL", () => {
    const result = resolveNavIconThumbUrl("https://cdn.damatong.net/prod/uploads/a.webp");
    expect(result).toContain("/media/nav-icon-thumb?src=");
    expect(decodeURIComponent(result)).toContain("https://cdn.damatong.net/prod/uploads/a.webp");
  });

  it("leaves token icons unchanged", () => {
    expect(resolveNavIconThumbUrl("coupon")).toBe("coupon");
  });
});
