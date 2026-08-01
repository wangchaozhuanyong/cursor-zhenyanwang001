import { describe, expect, it } from "vitest";
import type { Banner } from "@/types/banner";
import {
  readBannerMediaRepairScopeFromSearch,
  sortBannersByRepairPriority,
} from "./adminBannersViewState";

function banner(id: string, title: string): Banner {
  return {
    id,
    title,
    description: "",
    cta_text: "",
    link: "",
    image: "",
    image_mobile: "",
    image_desktop: "",
    sort_order: 0,
    enabled: true,
  };
}

describe("后台轮播修复视图状态", () => {
  it("accepts only the dedicated home responsive-media queue", () => {
    expect(readBannerMediaRepairScopeFromSearch(
      "?media_status=responsive_missing&repair_scope=home",
    )).toBe("home");
    expect(readBannerMediaRepairScopeFromSearch("?repair_scope=home")).toBe("");
    expect(readBannerMediaRepairScopeFromSearch(
      "?media_status=responsive_missing&repair_scope=all",
    )).toBe("");
  });

  it("keeps only readiness items and follows their priority order", () => {
    const rows = [
      banner("banner-3", "第三张"),
      banner("banner-other", "普通轮播"),
      banner("banner-1", "第一张"),
      banner("banner-2", "第二张"),
    ];

    expect(sortBannersByRepairPriority(rows, ["banner-1", "banner-2", "banner-3"]))
      .toEqual([
        expect.objectContaining({ id: "banner-1" }),
        expect.objectContaining({ id: "banner-2" }),
        expect.objectContaining({ id: "banner-3" }),
      ]);
  });
});
