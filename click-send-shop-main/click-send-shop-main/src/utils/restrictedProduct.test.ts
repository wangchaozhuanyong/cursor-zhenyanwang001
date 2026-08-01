import { describe, expect, it } from "vitest";
import { isRestrictedProduct } from "@/utils/restrictedProduct";

describe("isRestrictedProduct", () => {
  it("treats a product in a restricted category as restricted even when its short name is neutral", () => {
    expect(isRestrictedProduct({
      name: "7星1",
      category_name: "正品烟草",
      is_age_restricted: false,
      compliance_type: "normal",
    })).toBe(true);
  });

  it("does not restrict a normal product without restricted metadata", () => {
    expect(isRestrictedProduct({
      name: "日常纸巾",
      category_name: "家居生活",
      is_age_restricted: false,
      compliance_type: "normal",
    })).toBe(false);
  });
});
