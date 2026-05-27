import { describe, expect, it } from "vitest";
import { adminTabPathKey } from "@/config/adminWorkTab";

describe("adminTabPathKey", () => {
  it("uses pathname only for normal routes", () => {
    expect(adminTabPathKey("/admin/products")).toBe("/admin/products");
    expect(adminTabPathKey("/admin/reports/daily?range=last_7_days")).toBe("/admin/reports/daily");
  });

  it("includes scoped query for activity create routes", () => {
    expect(adminTabPathKey("/admin/marketing/activities/new?type=flash_sale")).toBe("/admin/marketing/activities/new?type=flash_sale");
    expect(adminTabPathKey("/admin/marketing/activities/new?type=full_reduction&unused=1")).toBe("/admin/marketing/activities/new?type=full_reduction");
    expect(adminTabPathKey("/admin/marketing/activities/new?copy_from=abc123")).toBe("/admin/marketing/activities/new?copy_from=abc123");
  });
});
