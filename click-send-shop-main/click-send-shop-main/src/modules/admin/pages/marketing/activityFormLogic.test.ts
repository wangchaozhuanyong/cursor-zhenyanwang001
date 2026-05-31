import { describe, expect, it } from "vitest";
import {
  createInitialActivityForm,
  normalizePayloadForSubmit,
  validateActivityForm,
} from "./activityFormLogic";
import { getAllowedDisplayPositionsForActivity } from "@/constants/marketingDisplayPositions";

describe("activityFormLogic", () => {
  it("keeps flash sale scope derived from selected items", () => {
    const form = createInitialActivityForm("flash_sale");
    form.items = [
      { product_id: "p1", activity_price: 8, activity_stock: 5, limit_per_user: 1 },
      { product_id: "p1", activity_price: 8, activity_stock: 5, limit_per_user: 1 },
      { product_id: "p2", activity_price: 9, activity_stock: 3, limit_per_user: 0 },
    ];

    const payload = normalizePayloadForSubmit(form, "active");

    expect(payload.scope_type).toBe("product");
    expect(payload.scope_ids).toEqual(["p1", "p2"]);
    expect(payload.status).toBe("active");
  });

  it("requires object scope selections for non-flash-sale publish validation", () => {
    const form = createInitialActivityForm("full_reduction");
    form.title = "满减";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";
    form.scope_type = "product";
    form.scope_ids = [];

    expect(validateActivityForm({
      form,
      selectedScopeIds: [],
      invalidDisplayPositions: [],
      fullReductionRules: [{ threshold_amount: 100, discount_amount: 10 }],
    })).toBe("请选择活动适用商品");
  });

  it("accepts a complete full reduction form", () => {
    const form = createInitialActivityForm("full_reduction");
    form.title = "满减";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";
    form.scope_type = "product";
    form.scope_ids = ["p1"];

    expect(validateActivityForm({
      form,
      selectedScopeIds: ["p1"],
      invalidDisplayPositions: [],
      fullReductionRules: [{ threshold_amount: 100, discount_amount: 10 }],
    })).toBe("");
  });

  it("允许可发布活动选择营销横幅位", () => {
    for (const type of ["flash_sale", "full_reduction", "points_bonus"]) {
      expect(getAllowedDisplayPositionsForActivity(type)).toContain("promotion_banner");
    }
  });
});
