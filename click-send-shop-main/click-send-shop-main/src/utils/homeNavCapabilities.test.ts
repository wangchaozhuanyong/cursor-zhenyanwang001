import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CAPABILITIES, type SiteCapabilities } from "@/types/siteCapabilities";
import type { HomeNavItem } from "@/types/content";
import { isHomeNavItemVisible } from "./homeNavCapabilities";

function caps(patch: Partial<SiteCapabilities>) {
  return { ...DEFAULT_SITE_CAPABILITIES, ...patch };
}

function navItem(linkUrl: string): HomeNavItem {
  return {
    id: linkUrl,
    icon_url: "deals",
    title: "Deals",
    link_url: linkUrl,
    target_type: "url",
    sort_order: 1,
    enabled: true,
  };
}

describe("isHomeNavItemVisible", () => {
  it("shows Deals home nav items when mall plus coupon or points capability is enabled", () => {
    expect(isHomeNavItemVisible(navItem("/deals"), caps({ mallEnabled: true, couponEnabled: true, pointsEnabled: false }))).toBe(true);
    expect(isHomeNavItemVisible(navItem("/deals?type=flash_sale"), caps({ mallEnabled: true, couponEnabled: false, pointsEnabled: true }))).toBe(true);
  });

  it("hides Deals and legacy promotions home nav items when reward capabilities cannot support them", () => {
    const disabled = caps({ mallEnabled: true, couponEnabled: false, pointsEnabled: false });

    expect(isHomeNavItemVisible(navItem("/deals"), disabled)).toBe(false);
    expect(isHomeNavItemVisible(navItem("/promotions"), disabled)).toBe(false);
  });
});
