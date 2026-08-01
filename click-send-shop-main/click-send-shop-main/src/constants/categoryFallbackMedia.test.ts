import { describe, expect, it } from "vitest";

import {
  resolveCategoryFallbackHero,
  resolveCategoryRecommendedHero,
} from "./categoryFallbackMedia";

describe("resolveCategoryFallbackHero", () => {
  it.each([
    ["签证服务", "category-visa-hero.webp"],
    ["第二家园", "category-second-home-hero.webp"],
    ["留学办理", "category-study-hero.webp"],
    ["商业装修", "category-renovation-hero.webp"],
    ["正品酒水", "category-wine-hero.webp"],
    ["正品烟草", "category-tobacco-hero.webp"],
    ["零食饮料", "category-snacks-drinks-hero.webp"],
  ])("matches %s to its business-specific fallback", (name, expectedFile) => {
    expect(resolveCategoryFallbackHero(name)).toContain(expectedFile);
  });

  it("uses a neutral fallback for an unknown category", () => {
    expect(resolveCategoryFallbackHero("其他服务")).toContain("category-home-hero.webp");
    expect(resolveCategoryRecommendedHero("其他服务")).toBeNull();
  });
});
