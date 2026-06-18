import { describe, expect, it } from "vitest";
import { getStoreScrollKey } from "./storeScrollRestoration";

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
