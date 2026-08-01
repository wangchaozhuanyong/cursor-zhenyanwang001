import { describe, expect, it } from "vitest";

import { resolveBannerMedia } from "./bannerMedia";

const baseBanner = {
  id: "banner-1",
  title: "城市好物",
  image: "/uploads/legacy.webp",
  link: "/categories",
  sort_order: 1,
  enabled: true,
};

describe("resolveBannerMedia", () => {
  it("uses picture art direction instead of density-based source switching", () => {
    const media = resolveBannerMedia({
      ...baseBanner,
      image_mobile: "/uploads/mobile.webp",
      image_desktop: "/uploads/desktop.webp",
    }, { compactViewport: true });

    expect(media.src).toBe("/uploads/desktop.webp");
    expect(media.preloadSrc).toBe("/uploads/mobile.webp");
    expect(media.sources).toEqual([
      { media: "(max-width: 767px)", srcSet: "/uploads/mobile.webp" },
    ]);
  });

  it("keeps the desktop asset as the image fallback on wide viewports", () => {
    const media = resolveBannerMedia({
      ...baseBanner,
      image_mobile: "/uploads/mobile.webp",
      image_desktop: "/uploads/desktop.webp",
    }, { compactViewport: false });

    expect(media.preloadSrc).toBe("/uploads/desktop.webp");
    expect(media.desktopSrc).toBe("/uploads/desktop.webp");
  });

  it("falls back to one legacy image without creating a redundant source", () => {
    const media = resolveBannerMedia(baseBanner, { compactViewport: true });

    expect(media.src).toBe("/uploads/legacy.webp");
    expect(media.preloadSrc).toBe("/uploads/legacy.webp");
    expect(media.sources).toEqual([]);
  });
});
