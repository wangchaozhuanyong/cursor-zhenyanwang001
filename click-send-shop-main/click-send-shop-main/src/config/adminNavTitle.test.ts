import { describe, expect, it } from "vitest";
import { resolveAdminTabTitle } from "./adminNavTitle";

const t = (key: string) => key;

const navItems = [
  {
    label: "营销中心",
    path: "/admin/marketing",
    children: [
      { label: "活动总览", path: "/admin/marketing" },
      { label: "营销活动", path: "/admin/marketing/activities" },
      { label: "优惠券管理", path: "/admin/marketing/coupons" },
      { label: "领券记录", path: "/admin/marketing/coupons/records" },
    ],
  },
  {
    label: "数据中心",
    path: "/admin/reports/overview",
    children: [
      { label: "经营总览", path: "/admin/reports/overview" },
      {
        label: "销售与利润",
        path: "/admin/reports/sales-daily",
        children: [
          { label: "销售日报", path: "/admin/reports/sales-daily" },
          { label: "利润月报", path: "/admin/reports/profit-monthly" },
        ],
      },
    ],
  },
];

describe("resolveAdminTabTitle", () => {
  it("does not let marketing overview steal child route titles", () => {
    expect(resolveAdminTabTitle(navItems, "/admin/marketing", "后台", t)).toBe("活动总览");
    expect(resolveAdminTabTitle(navItems, "/admin/marketing/activities", "后台", t)).toBe("营销活动");
    expect(resolveAdminTabTitle(navItems, "/admin/marketing/coupons", "后台", t)).toBe("优惠券管理");
    expect(resolveAdminTabTitle(navItems, "/admin/marketing/coupons/records", "后台", t)).toBe("领券记录");
  });

  it("keeps nested report titles specific", () => {
    expect(resolveAdminTabTitle(navItems, "/admin/reports/overview", "后台", t)).toBe("经营总览");
    expect(resolveAdminTabTitle(navItems, "/admin/reports/sales-daily", "后台", t)).toBe("销售日报");
    expect(resolveAdminTabTitle(navItems, "/admin/reports/profit-monthly", "后台", t)).toBe("利润月报");
  });
});
