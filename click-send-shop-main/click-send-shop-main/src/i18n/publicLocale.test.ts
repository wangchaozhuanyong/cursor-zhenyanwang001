import { describe, expect, it } from "vitest";
import {
  getPublicLocaleFromPathname,
  isPublicLocale,
  localizePath,
  PUBLIC_LOCALES,
  stripPublicLocaleFromPath,
} from "./publicLocale";

describe("public locale config", () => {
  it("only exposes Chinese and optional English in the storefront", () => {
    expect(PUBLIC_LOCALES.map((item) => item.value)).toEqual(["zh", "en"]);
    expect(isPublicLocale("zh")).toBe(true);
    expect(isPublicLocale("en")).toBe(true);
    expect(isPublicLocale("ms")).toBe(false);
    expect(PUBLIC_LOCALES.some((item) => /Bahasa|BM/i.test(`${item.label}${item.shortLabel}`))).toBe(false);
  });

  it("keeps locale-prefixed paths reversible for the admin-controlled English switch", () => {
    expect(getPublicLocaleFromPathname("/en/promotions")).toBe("en");
    expect(getPublicLocaleFromPathname("/ms/promotions")).toBeNull();
    expect(stripPublicLocaleFromPath("/en/promotions?tab=flash#now")).toBe("/promotions?tab=flash#now");
    expect(stripPublicLocaleFromPath("/ms/promotions?tab=flash#now")).toBe("/ms/promotions?tab=flash#now");
    expect(localizePath("/promotions?tab=flash#now", "en")).toBe("/en/promotions?tab=flash#now");
  });
});
