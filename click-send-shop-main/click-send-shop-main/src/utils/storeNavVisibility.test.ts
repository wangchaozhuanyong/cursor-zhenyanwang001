import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CAPABILITIES, type SiteCapabilities } from "@/types/siteCapabilities";
import { isStoreNavPathVisible } from "./storeNavVisibility";

function caps(patch: Partial<SiteCapabilities>) {
  return { ...DEFAULT_SITE_CAPABILITIES, ...patch };
}

describe("isStoreNavPathVisible", () => {
  it("hides support navigation when customer service/download capability is disabled", () => {
    const disabled = caps({ customerServiceDownloadEnabled: false });

    expect(isStoreNavPathVisible("/support-download?tab=support", disabled)).toBe(false);
  });

  it("hides mall-only navigation when mall capability is disabled", () => {
    const disabled = caps({ mallEnabled: false });

    expect(isStoreNavPathVisible("/categories", disabled)).toBe(false);
    expect(isStoreNavPathVisible("/cart", disabled)).toBe(false);
  });

  it("keeps always-on store navigation visible", () => {
    const disabled = caps({ mallEnabled: false, customerServiceDownloadEnabled: false });

    expect(isStoreNavPathVisible("/", disabled)).toBe(true);
    expect(isStoreNavPathVisible("/profile", disabled)).toBe(true);
  });
});
