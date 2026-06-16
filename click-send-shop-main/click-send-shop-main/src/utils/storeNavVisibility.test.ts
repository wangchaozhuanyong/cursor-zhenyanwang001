import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CAPABILITIES, type SiteCapabilities } from "@/types/siteCapabilities";
import { isStoreNavPathVisible } from "./storeNavVisibility";

function caps(patch: Partial<SiteCapabilities>) {
  return { ...DEFAULT_SITE_CAPABILITIES, ...patch };
}

describe("isStoreNavPathVisible", () => {
  it("shows support/download when customer service is enabled", () => {
    const enabled = caps({ customerServiceDownloadEnabled: true });

    expect(isStoreNavPathVisible("/support-download?tab=support", enabled)).toBe(true);
  });

  it("hides mall-only navigation when mall capability is disabled", () => {
    const disabled = caps({ mallEnabled: false });

    expect(isStoreNavPathVisible("/categories", disabled)).toBe(false);
    expect(isStoreNavPathVisible("/cart", disabled)).toBe(false);
  });

  it("hides coupon navigation when coupon capability is disabled", () => {
    const disabled = caps({ couponEnabled: false });

    expect(isStoreNavPathVisible("/coupons", disabled)).toBe(false);
  });

  it("hides deals navigation when mall and reward capabilities cannot support it", () => {
    const disabled = caps({ mallEnabled: true, couponEnabled: false, pointsEnabled: false });

    expect(isStoreNavPathVisible("/deals", disabled)).toBe(false);
    expect(isStoreNavPathVisible("/promotions", disabled)).toBe(false);
  });

  it("keeps deals visible when coupons or points are enabled", () => {
    expect(isStoreNavPathVisible("/deals", caps({ couponEnabled: true, pointsEnabled: false }))).toBe(true);
    expect(isStoreNavPathVisible("/deals", caps({ couponEnabled: false, pointsEnabled: true }))).toBe(true);
  });

  it("keeps always-on store navigation visible", () => {
    const disabled = caps({ mallEnabled: false, customerServiceDownloadEnabled: false });

    expect(isStoreNavPathVisible("/", disabled)).toBe(true);
    expect(isStoreNavPathVisible("/profile", disabled)).toBe(true);
  });
});
