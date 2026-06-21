import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeThemeConfig } from "@/utils/themeConfig";
import { generateThemePalette } from "@/utils/themeContrast";

describe("themeConfig", () => {
  it("keeps storefront structure fields from admin config", () => {
    const config = normalizeThemeConfig({
      buttonStyle: "square",
      navStyle: "clean",
      productCardVariant: "compact",
      cardStyle: "minimal",
      cardTextAlign: "center",
      imageRatio: "16 / 9",
      imageFit: "contain",
      homeLayout: "magazine",
      headerStyle: "dark",
      bannerStyle: "clean",
      couponStyle: "ticket",
      memberCardStyle: "blackGold",
      categoryIconStyle: "outline",
      motionLevel: "none",
      density: "compact",
      radius: "10px",
    });

    expect(config.buttonStyle).toBe("square");
    expect(config.navStyle).toBe("clean");
    expect(config.productCardVariant).toBe("compact");
    expect(config.cardStyle).toBe("minimal");
    expect(config.cardTextAlign).toBe("center");
    expect(config.imageRatio).toBe("16 / 9");
    expect(config.imageFit).toBe("contain");
    expect(config.homeLayout).toBe("magazine");
    expect(config.headerStyle).toBe("dark");
    expect(config.bannerStyle).toBe("clean");
    expect(config.couponStyle).toBe("ticket");
    expect(config.memberCardStyle).toBe("blackGold");
    expect(config.categoryIconStyle).toBe("outline");
    expect(config.motionLevel).toBe("none");
    expect(config.density).toBe("compact");
    expect(config.radius).toBe("10px");
  });

  it("emits palette variables from normalized structure fields", () => {
    const config = normalizeThemeConfig({
      buttonStyle: "square",
      navStyle: "clean",
      productCardVariant: "deal",
      couponStyle: "minimal",
      memberCardStyle: "fresh",
      categoryIconStyle: "solid",
      motionLevel: "none",
      density: "compact",
      radius: "10px",
    });
    const palette = generateThemePalette(config);

    expect(palette["--theme-button-style"]).toBe("square");
    expect(palette["--theme-nav-style"]).toBe("clean");
    expect(palette["--theme-product-card-variant"]).toBe("deal");
    expect(palette["--theme-coupon-style"]).toBe("minimal");
    expect(palette["--theme-member-card-style"]).toBe("fresh");
    expect(palette["--theme-category-icon-style"]).toBe("solid");
    expect(palette["--theme-motion-level"]).toBe("none");
    expect(palette["--theme-density"]).toBe("compact");
    expect(palette["--store-card-radius"]).toContain("10px");
    expect(palette["--store-panel-radius"]).toContain("10px");
  });

  it("keeps new mall skin fields and mall CSS variables", () => {
    const config = normalizeThemeConfig({
      shadowStyle: "aerial",
      buttonStyle: "capsule",
      navStyle: "glassLine",
      badgeStyle: "technical",
      priceStyle: "tabularBold",
      productCardVariant: "spec",
      cardStyle: "glassBordered",
      imageRatio: "4 / 3",
      homeLayout: "modularShowcase",
      headerStyle: "floatingGlass",
      bannerStyle: "panoramicLight",
      couponStyle: "precisionVoucher",
      memberCardStyle: "titaniumBlue",
      categoryIconStyle: "monoGlyph",
      density: "airy",
      adminThemeMode: "follow_store",
      texture: {
        material: "titaniumMist",
        intensity: "subtle",
        surface: "satinGlass",
        grain: "microEtchedNoise",
        grainOpacity: 0.018,
        highlight: "edgeSheen",
        highlightOpacity: 0.1,
        metal: "brushedTitanium",
        pattern: "technicalGrid",
        patternOpacity: 0.055,
        line: "coolHairlineInnerHighlight",
        shadow: "wideBlueAmbientShortContact",
        temperature: "coolNeutral",
        imageContrast: 0.94,
        imageSaturation: 0.88,
      },
      festival: {
        mode: "none",
        activation: "manual",
        dateMode: "solar",
        leadDays: 0,
        tailDays: 0,
        decorativeDensity: "quiet",
        showCountdown: false,
        fallbackSkinId: null,
      },
    });
    const palette = generateThemePalette(config);

    expect(config.adminThemeMode).toBe("fixed");
    expect(config.homeLayout).toBe("modularShowcase");
    expect(config.texture.material).toBe("titaniumMist");
    expect(palette["--mall-bg"]).toBeTruthy();
    expect(palette["--mall-grain-opacity"]).toBe("0.018");
    expect(palette["--theme-image-filter"]).toContain("contrast(0.94)");
  });

  it("keeps structural theme CSS wired to core storefront pages", () => {
    const css = readFileSync(join(process.cwd(), "src/styles/client-redesign.css"), "utf8");

    [
      "data-theme-button-style",
      "data-theme-nav-style",
      "data-theme-product-card-variant",
      "data-theme-card-style",
      "data-theme-image-ratio",
      "data-theme-image-fit",
      "data-theme-coupon-style",
      "data-theme-member-card-style",
      "data-theme-category-icon-style",
      "data-theme-home-layout",
      "data-theme-header-style",
      "data-theme-banner-style",
      "data-theme-motion-level",
      "data-theme-density",
      "data-home-layout",
      "data-product-card",
      "data-texture",
      "var(--mall-surface)",
      ".store-home-v12-page",
      ".store-category-page",
      ".store-promotions-v12-card",
      ".store-cart-page .store-cart-item",
      ".store-product-detail-page .store-detail-gallery",
      ".store-account-v12-hero",
    ].forEach((needle) => {
      expect(css).toContain(needle);
    });
  });
});
