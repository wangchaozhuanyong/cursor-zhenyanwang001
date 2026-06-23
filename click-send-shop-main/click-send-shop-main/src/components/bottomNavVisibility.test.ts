import { describe, expect, it } from "vitest";
import { shouldHideBottomNav } from "./bottomNavVisibility";

describe("shouldHideBottomNav", () => {
  it("hides on checkout paths", () => {
    expect(shouldHideBottomNav("/checkout")).toBe(true);
    expect(shouldHideBottomNav("/checkout/confirm")).toBe(true);
  });

  it("hides on search paths", () => {
    expect(shouldHideBottomNav("/search")).toBe(true);
    expect(shouldHideBottomNav("/en/search")).toBe(true);
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
});
