import { describe, expect, it } from "vitest";
import { RECYCLE_TYPE_FILTER_OPTIONS, RECYCLE_TYPE_LABELS } from "@/utils/adminDisplayLabels";

describe("recycle bin display labels", () => {
  it("matches backend-supported recycle bin types", () => {
    expect(RECYCLE_TYPE_LABELS.coupon_campaigns).toBe("礼券发行");
    expect(RECYCLE_TYPE_LABELS.activities).toBeUndefined();
    expect(RECYCLE_TYPE_FILTER_OPTIONS.some((option) => option.value === "coupon_campaigns")).toBe(true);
    expect(RECYCLE_TYPE_FILTER_OPTIONS.some((option) => option.value === "activities")).toBe(false);
  });
});
