import { describe, expect, it } from "vitest";

import {
  DEFAULT_HOME_BANNERS,
  HOME_BANNER_ASSET_REVISION,
  resolveHomeBannerSet,
} from "@/constants/homeBannerDefaults";
import { normalizeBootstrapBanners } from "./useHomeBanners";

describe("fixed storefront home banners", () => {
  it("keeps responsive image fields from the bootstrap response", () => {
    const banners = normalizeBootstrapBanners([{
      id: "banner-1",
      title: "城市好物",
      image: "/uploads/legacy.webp",
      image_mobile: "/uploads/mobile.webp",
      image_desktop: "/uploads/desktop.webp",
    }]);

    expect(banners).toHaveLength(1);
    expect(banners[0]).toMatchObject({
      image: "/uploads/legacy.webp",
      image_mobile: "/uploads/mobile.webp",
      image_desktop: "/uploads/desktop.webp",
    });
  });

  it("keeps responsive banners when the sanitized legacy image is empty", () => {
    const banners = normalizeBootstrapBanners([{
      id: "banner-responsive-only",
      title: "城市好物",
      image: "",
      image_mobile: "/uploads/mobile.webp",
      image_desktop: "/uploads/desktop.webp",
    }]);

    expect(banners).toHaveLength(1);
    expect(banners[0].image_mobile).toBe("/uploads/mobile.webp");
    expect(banners[0].image_desktop).toBe("/uploads/desktop.webp");
  });

  it("uses the selected fixed visual when remote banners are legacy", () => {
    const resolved = resolveHomeBannerSet([
      {
        id: "legacy-1",
        title: "大马通平台总览",
        image: "/assets/home-banners/home-hero-01-platform-bg.webp",
      },
    ]);

    expect(resolved).toEqual(DEFAULT_HOME_BANNERS);
    expect(resolved).toHaveLength(7);
    expect(resolved[0].image_mobile).toContain("home-banner-01-customer-support-mobile.webp");
    expect(resolved[0].image_desktop).toContain("home-banner-01-customer-support-desktop.webp");
    expect(resolved.at(-1)?.image_mobile).toContain("home-banner-07-gift-selection-mobile.webp");
    expect(HOME_BANNER_ASSET_REVISION).toContain("fixed-responsive");
  });

  it("does not let image-only banners reintroduce the retired visual system", () => {
    const resolved = resolveHomeBannerSet([
      {
        id: "legacy-custom",
        title: "会员权益与奖励",
        image: "https://cdn.example.com/old-member-banner.webp",
      },
    ]);

    expect(resolved).toEqual(DEFAULT_HOME_BANNERS);
  });

  it("keeps only banners prepared for the fixed responsive slots", () => {
    const responsive = {
      id: "responsive-1",
      title: "城市好物",
      image: "/uploads/fallback.webp",
      image_mobile: "/uploads/mobile.webp",
      image_desktop: "/uploads/desktop.webp",
    };
    const resolved = resolveHomeBannerSet([
      {
        id: "legacy-custom",
        title: "旧活动",
        image: "/uploads/old.webp",
      },
      responsive,
    ]);

    expect(resolved).toEqual([responsive]);
  });
});
