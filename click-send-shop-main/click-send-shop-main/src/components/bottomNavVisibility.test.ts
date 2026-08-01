import { describe, expect, it } from "vitest";
import { shouldHideBottomNav, shouldSkipIdleTabRoutePreload } from "./bottomNavVisibility";

describe("shouldHideBottomNav", () => {
  it("hides on checkout paths", () => {
    expect(shouldHideBottomNav("/checkout")).toBe(true);
    expect(shouldHideBottomNav("/checkout/confirm")).toBe(true);
  });

  it("hides on search paths", () => {
    expect(shouldHideBottomNav("/search")).toBe(true);
    expect(shouldHideBottomNav("/en/search")).toBe(true);
  });

  it("hides on standalone support flows mounted inside the front layout", () => {
    expect(shouldHideBottomNav("/support-download")).toBe(true);
    expect(shouldHideBottomNav("/en/support-download")).toBe(true);
  });

  it("hides on detail pages while keeping promotion list navigation", () => {
    expect(shouldHideBottomNav("/product/demo-product")).toBe(true);
    expect(shouldHideBottomNav("/promotions/demo-campaign")).toBe(true);
    expect(shouldHideBottomNav("/en/promotions/demo-campaign")).toBe(true);
    expect(shouldHideBottomNav("/promotions")).toBe(false);
  });

  it("shows on other paths", () => {
    expect(shouldHideBottomNav("/")).toBe(false);
    expect(shouldHideBottomNav("/cart")).toBe(false);
  });

  it("keeps compact touch devices from importing idle tab routes", () => {
    const descriptors = {
      maxTouchPoints: Object.getOwnPropertyDescriptor(navigator, "maxTouchPoints"),
      screen: Object.getOwnPropertyDescriptor(window, "screen"),
      innerWidth: Object.getOwnPropertyDescriptor(window, "innerWidth"),
      innerHeight: Object.getOwnPropertyDescriptor(window, "innerHeight"),
    };

    try {
      Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 1 });
      Object.defineProperty(window, "screen", { configurable: true, value: { width: 390, height: 844 } });
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });

      expect(shouldSkipIdleTabRoutePreload()).toBe(true);

      Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
      expect(shouldSkipIdleTabRoutePreload()).toBe(false);
    } finally {
      Object.entries(descriptors).forEach(([key, descriptor]) => {
        const target = key === "maxTouchPoints" ? navigator : window;
        if (descriptor) {
          Object.defineProperty(target, key, descriptor);
        } else {
          delete (target as unknown as Record<string, unknown>)[key];
        }
      });
    }
  });
});
