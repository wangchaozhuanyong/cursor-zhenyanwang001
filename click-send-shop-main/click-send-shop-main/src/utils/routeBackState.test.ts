import { describe, expect, it } from "vitest";
import { resolveTrackedRouteBackSource } from "@/utils/routeBackState";

describe("resolveTrackedRouteBackSource", () => {
  it("uses the previous route for real page navigation", () => {
    expect(
      resolveTrackedRouteBackSource({
        previousPath: "/categories?cat=food",
        currentPath: "/search",
      }),
    ).toBe("/categories?cat=food");
  });

  it("inherits the original source for same-page search param changes", () => {
    expect(
      resolveTrackedRouteBackSource({
        previousPath: "/search",
        currentPath: "/search?keyword=1",
        previousStoredFrom: "/categories?cat=food",
      }),
    ).toBe("/categories?cat=food");
  });

  it("does not treat same-page param changes as a back source without an original source", () => {
    expect(
      resolveTrackedRouteBackSource({
        previousPath: "/search",
        currentPath: "/search?keyword=1",
      }),
    ).toBeUndefined();
  });

  it("does not remember a child detail page or its parent tab as the parent list back source", () => {
    expect(
      resolveTrackedRouteBackSource({
        previousPath: "/orders/order-1",
        currentPath: "/orders",
        previousStoredFrom: "/orders?tab=paid",
      }),
    ).toBeUndefined();

    expect(
      resolveTrackedRouteBackSource({
        previousPath: "/returns/return-1",
        currentPath: "/returns",
      }),
    ).toBeUndefined();
  });

  it("keeps an external hub source when returning from a child detail page to its parent list", () => {
    expect(
      resolveTrackedRouteBackSource({
        previousPath: "/orders/order-1",
        currentPath: "/orders",
        previousStoredFrom: "/profile",
      }),
    ).toBe("/profile");
  });
});
