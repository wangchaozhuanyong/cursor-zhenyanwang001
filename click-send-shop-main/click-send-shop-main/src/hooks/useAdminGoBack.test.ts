import { describe, expect, it } from "vitest";
import { resolveAdminBackTarget } from "@/hooks/useAdminGoBack";

describe("resolveAdminBackTarget", () => {
  it("prefers admin state source with query", () => {
    expect(
      resolveAdminBackTarget({
        pathname: "/admin/products/123",
        stateFrom: "/admin/products?status=active&page=2",
        storedFrom: "/admin",
        fallback: "/admin/products",
      }),
    ).toBe("/admin/products?status=active&page=2");
  });

  it("uses tracked admin source before fallback", () => {
    expect(
      resolveAdminBackTarget({
        pathname: "/admin/marketing/activities/abc/edit",
        storedFrom: "/admin/reports/activities?activity_id=abc",
        fallback: "/admin/marketing/activities",
      }),
    ).toBe("/admin/reports/activities?activity_id=abc");
  });

  it("ignores public, login, and current-page sources", () => {
    expect(
      resolveAdminBackTarget({
        pathname: "/admin/marketing/coupons/new",
        stateFrom: "/login",
        storedFrom: "/admin/marketing/coupons/new",
        fallback: "/admin/marketing/coupons",
      }),
    ).toBe("/admin/marketing/coupons");
  });

  it("falls back to admin home when fallback is unsafe", () => {
    expect(
      resolveAdminBackTarget({
        pathname: "/admin/products/new",
        stateFrom: "/products",
        storedFrom: "//evil.example/path",
        fallback: "/",
      }),
    ).toBe("/admin");
  });
});
