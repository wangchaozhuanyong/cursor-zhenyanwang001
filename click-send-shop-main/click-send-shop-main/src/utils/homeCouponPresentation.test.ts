import { describe, expect, it } from "vitest";
import type { MarketingCouponPublic } from "@/services/marketingService";
import type { UserCoupon } from "@/types/coupon";
import { buildHomeCouponCardItems, summarizeHomeCouponState } from "./homeCouponPresentation";

function publicCoupon(id: string): MarketingCouponPublic {
  return {
    id,
    code: `CODE_${id}`,
    title: `测试券${id}`,
    type: "fixed",
    value: 10,
    min_amount: 100,
    start_date: "2026-05-01",
    end_date: "2026-06-30",
    description: "",
    scope_type: "all",
    display_badge: "",
    category_ids: [],
    category_names: [],
  };
}

function userCoupon(id: string, status: UserCoupon["status"], claimed = true): UserCoupon {
  return {
    id: `uc_${id}_${status}`,
    claimed_at: claimed ? "2026-05-29T01:00:00.000Z" : "",
    status,
    coupon: {
      id,
      code: `CODE_${id}`,
      title: `测试券${id}`,
      type: "fixed",
      value: 10,
      min_amount: 100,
      start_date: "2026-05-01",
      end_date: "2026-06-30",
      status: "available",
    },
  };
}

describe("首页优惠券展示状态", () => {
  it("未登录用户看到领取入口", () => {
    const items = buildHomeCouponCardItems([publicCoupon("a")], [], false);
    expect(items).toHaveLength(1);
    expect(items[0].action).toBe("claim");
    expect(items[0].actionLabel).toBe("立即领取");
  });

  it("已领取且可用时展示去使用", () => {
    const items = buildHomeCouponCardItems([publicCoupon("a")], [userCoupon("a", "available")], true);
    expect(items).toHaveLength(1);
    expect(items[0].action).toBe("use");
    expect(items[0].actionLabel).toBe("去使用");
    expect(items[0].statusLabel).toBe("已领取");
  });

  it("可领取但未领取时继续展示领取", () => {
    const items = buildHomeCouponCardItems([publicCoupon("a")], [userCoupon("a", "available", false)], true);
    expect(items).toHaveLength(1);
    expect(items[0].action).toBe("claim");
  });

  it("已使用且不可再领时不再展示券卡", () => {
    const items = buildHomeCouponCardItems([publicCoupon("a")], [userCoupon("a", "used")], true);
    expect(items).toHaveLength(0);
  });

  it("能统计可领可用和已完成数量", () => {
    const summary = summarizeHomeCouponState([
      userCoupon("a", "available", false),
      userCoupon("b", "available"),
      userCoupon("c", "used"),
    ]);
    expect(summary).toEqual({ claimableCount: 1, usableCount: 1, completedCount: 1 });
  });
});
