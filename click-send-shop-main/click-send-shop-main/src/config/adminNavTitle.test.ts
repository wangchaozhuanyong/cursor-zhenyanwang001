import { describe, expect, it } from "vitest";
import { resolveAdminTabTitle } from "./adminNavTitle";

describe("resolveAdminTabTitle", () => {
  const t = (k: string) => k;

  it("不会让与父级同 path 的子项抢占其它子路由", () => {
    const navItems = [
      {
        label: "监控中心",
        path: "/admin/monitoring",
        children: [
          { label: "数据总览", path: "/admin/monitoring" },
          { label: "运行记录", path: "/admin/monitoring/runs" },
        ],
      },
    ];

    expect(resolveAdminTabTitle(navItems, "/admin/monitoring", "fallback", t)).toBe("数据总览");
    expect(resolveAdminTabTitle(navItems, "/admin/monitoring/runs", "fallback", t)).toBe("运行记录");
    expect(resolveAdminTabTitle(navItems, "/admin/monitoring/runs/123", "fallback", t)).toBe("运行记录");
  });

  it("同理适用于订单/营销等父子同 path 的结构", () => {
    const navItems = [
      {
        label: "订单中心",
        path: "/admin/orders",
        children: [
          { label: "订单管理", path: "/admin/orders" },
          { label: "未完成结账", path: "/admin/orders/unfinished" },
        ],
      },
    ];

    expect(resolveAdminTabTitle(navItems, "/admin/orders", "fallback", t)).toBe("订单管理");
    expect(resolveAdminTabTitle(navItems, "/admin/orders/unfinished", "fallback", t)).toBe("未完成结账");
  });

  it("优先匹配优惠券模板里更具体的子路由", () => {
    const navItems = [
      {
        label: "营销中心",
        path: "/admin/marketing",
        children: [
          {
            label: "优惠券模板",
            path: "/admin/marketing/coupons",
            children: [
              { label: "优惠券模板", path: "/admin/marketing/coupons" },
              { label: "用户券记录", path: "/admin/marketing/coupons/records" },
            ],
          },
        ],
      },
    ];

    expect(resolveAdminTabTitle(navItems, "/admin/marketing/coupons", "fallback", t)).toBe("优惠券模板");
    expect(resolveAdminTabTitle(navItems, "/admin/marketing/coupons/records", "fallback", t)).toBe("用户券记录");
  });
});
