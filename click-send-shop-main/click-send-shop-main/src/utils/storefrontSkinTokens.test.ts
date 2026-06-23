import { describe, expect, it } from "vitest";

import {
  IRIS_CONFIG,
  MIDAUTUMN_CONFIG,
  MOSS_CONFIG,
  NEWYEAR_CONFIG,
  POLAR_CONFIG,
  PREMIUM_CHAMPAGNE_IVORY_CONFIG,
} from "@/constants/themePresets";
import { buildStorefrontNextSkinTokens } from "@/utils/storefrontSkinTokens";
import { generateThemePalette } from "@/utils/themeContrast";

describe("storefrontSkinTokens", () => {
  it("keeps the storefront next visual base skin-aware", () => {
    const polarTokens = buildStorefrontNextSkinTokens(POLAR_CONFIG, generateThemePalette(POLAR_CONFIG));
    const mossTokens = buildStorefrontNextSkinTokens(MOSS_CONFIG, generateThemePalette(MOSS_CONFIG));

    expect(polarTokens["--sf-canvas"]).not.toBe(mossTokens["--sf-canvas"]);
    expect(polarTokens["--theme-bg"]).not.toBe(mossTokens["--theme-bg"]);
    expect(polarTokens["--theme-primary"]).not.toBe(mossTokens["--theme-primary"]);
    expect(polarTokens["--sf-accent"]).toBe(polarTokens["--theme-primary"]);
    expect(mossTokens["--sf-accent"]).toBe(mossTokens["--theme-primary"]);
  });

  it("keeps the six published storefront skins visually distinguishable", () => {
    const configs = [
      POLAR_CONFIG,
      MOSS_CONFIG,
      IRIS_CONFIG,
      NEWYEAR_CONFIG,
      MIDAUTUMN_CONFIG,
      PREMIUM_CHAMPAGNE_IVORY_CONFIG,
    ];
    const signatures = configs.map((config) => {
      const tokens = buildStorefrontNextSkinTokens(config, generateThemePalette(config));
      return [
        tokens["--sf-canvas"],
        tokens["--sf-surface"],
        tokens["--theme-primary"],
        tokens["--theme-price"],
        tokens["--sf-texture-grain-opacity"],
      ].join("|");
    });

    expect(new Set(signatures).size).toBe(configs.length);
  });

  it("keeps the premium default skin on an explicit texture profile", () => {
    const tokens = buildStorefrontNextSkinTokens(
      PREMIUM_CHAMPAGNE_IVORY_CONFIG,
      generateThemePalette(PREMIUM_CHAMPAGNE_IVORY_CONFIG),
    );

    expect(PREMIUM_CHAMPAGNE_IVORY_CONFIG.texture.material).toBe("obsidianCinnabarIvory");
    expect(tokens["--sf-texture-grain-opacity"]).toBe("0.016");
    expect(tokens["--sf-image-filter"]).toContain("contrast(0.92)");
  });
});
