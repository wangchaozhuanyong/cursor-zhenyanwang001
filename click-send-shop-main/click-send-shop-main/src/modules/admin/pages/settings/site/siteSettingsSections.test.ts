import { describe, expect, it } from "vitest";
import { readSiteSettingsSectionIdFromHash } from "./siteSettingsSections";

describe("readSiteSettingsSectionIdFromHash", () => {
  it("accepts a direct settings section hash", () => {
    expect(readSiteSettingsSectionIdFromHash("#compliance")).toBe("compliance");
    expect(readSiteSettingsSectionIdFromHash("brand")).toBe("brand");
  });

  it("rejects unknown or malformed hashes", () => {
    expect(readSiteSettingsSectionIdFromHash("#unknown")).toBeNull();
    expect(readSiteSettingsSectionIdFromHash("#%E0%A4%A")).toBeNull();
    expect(readSiteSettingsSectionIdFromHash("")).toBeNull();
  });
});
