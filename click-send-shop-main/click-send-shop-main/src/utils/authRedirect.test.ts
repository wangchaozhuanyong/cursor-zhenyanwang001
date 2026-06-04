import { describe, expect, it } from "vitest";
import {
  isStoreAuthRequiredRoute,
  resolveAuthRedirectTarget,
  resolveLoginCancelTarget,
} from "@/utils/authRedirect";

describe("auth redirect navigation", () => {
  it("keeps protected route as the post-login target", () => {
    expect(resolveAuthRedirectTarget("/checkout?coupon_id=c1")).toBe("/checkout?coupon_id=c1");
  });

  it("does not use auth pages or admin pages as the post-login target", () => {
    expect(resolveAuthRedirectTarget("/login")).toBe("/");
    expect(resolveAuthRedirectTarget("/admin/orders")).toBe("/");
  });

  it("recognizes storefront routes that require login", () => {
    expect(isStoreAuthRequiredRoute("/checkout")).toBe(true);
    expect(isStoreAuthRequiredRoute("/orders/123")).toBe(true);
    expect(isStoreAuthRequiredRoute("/product/sku-1")).toBe(false);
  });

  it("uses cancelFrom before a protected return target when cancelling login", () => {
    expect(
      resolveLoginCancelTarget({
        currentPath: "/login",
        cancelFrom: "/product/sku-1",
        returnTo: "/checkout",
        trackedFrom: "/checkout",
      }),
    ).toBe("/product/sku-1");
  });

  it("falls back home when every cancel target would loop back to login", () => {
    expect(
      resolveLoginCancelTarget({
        currentPath: "/login",
        returnTo: "/checkout",
        trackedFrom: "/login",
      }),
    ).toBe("/");
  });

  it("allows public pages as cancel targets", () => {
    expect(
      resolveLoginCancelTarget({
        currentPath: "/login",
        returnTo: "/cart",
      }),
    ).toBe("/cart");
  });
});
