import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRememberedStoreNavigationState,
  getRememberedStoreTabPath,
  getStoreScrollKey,
  getStoreTabPathKey,
  rememberStoreTabPath,
} from "./storeScrollRestoration";

beforeEach(() => {
  clearRememberedStoreNavigationState();
});

describe("getStoreScrollKey", () => {
  it("keeps promotions filters on the same scroll key", () => {
    expect(getStoreScrollKey("/promotions", "?type=flash_sale")).toBe("/promotions");
    expect(getStoreScrollKey("/promotions", "?type=coupon")).toBe("/promotions");
    expect(getStoreScrollKey("/en/promotions", "?type=flash_sale")).toBe("/promotions");
  });

  it("still separates non-filter pages by query params", () => {
    expect(getStoreScrollKey("/products/abc", "?from=promotions")).toBe("/products/abc?from=promotions");
  });
});

describe("store tab path restoration", () => {
  it("maps bottom nav aliases to their stable tab keys", () => {
    expect(getStoreTabPathKey("/new-arrivals")).toBe("/categories");
    expect(getStoreTabPathKey("/deals?type=flash_sale")).toBe("/promotions");
    expect(getStoreTabPathKey("/product/abc")).toBeNull();
  });

  it("returns the last remembered path for a tab", () => {
    rememberStoreTabPath("/en/categories", "?cat=food&sort=newest");

    expect(getRememberedStoreTabPath("/categories")).toBe("/categories?cat=food&sort=newest");
    expect(getRememberedStoreTabPath("/en/categories")).toBe("/categories?cat=food&sort=newest");
  });

  it("hydrates remembered tab paths from session storage", () => {
    window.sessionStorage.setItem(
      "store_tab_paths_v1",
      JSON.stringify([["/promotions", "/promotions?type=flash_sale"]]),
    );

    expect(getRememberedStoreTabPath("/promotions")).toBe("/promotions?type=flash_sale");
  });
});
