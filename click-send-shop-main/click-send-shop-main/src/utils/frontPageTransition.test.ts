import { describe, expect, it } from "vitest";
import { shouldDisableStoreRouteTransform } from "./frontPageTransition";

describe("shouldDisableStoreRouteTransform", () => {
  it("disables transform on store tab routes", () => {
    expect(shouldDisableStoreRouteTransform("/")).toBe(true);
    expect(shouldDisableStoreRouteTransform("/cart")).toBe(true);
  });

  it("disables transform on product detail routes with viewport-fixed actions", () => {
    expect(shouldDisableStoreRouteTransform("/product/p1")).toBe(true);
    expect(shouldDisableStoreRouteTransform("/product/p1/reviews")).toBe(true);
  });

  it("keeps transform on normal non-tab store routes", () => {
    expect(shouldDisableStoreRouteTransform("/history")).toBe(false);
    expect(shouldDisableStoreRouteTransform("/content/about")).toBe(false);
  });
});
