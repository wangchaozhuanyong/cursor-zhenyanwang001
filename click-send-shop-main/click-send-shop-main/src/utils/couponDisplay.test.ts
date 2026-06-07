import { describe, expect, it } from "vitest";
import type { UserCoupon } from "@/types/coupon";
import { formatCouponExpireText, userCouponToPremiumDisplay } from "./couponDisplay";

function userCoupon(overrides: Partial<UserCoupon> = {}): UserCoupon {
  return {
    id: "uc-1",
    claimed_at: "2026-06-01T04:00:00.000Z",
    status: "available",
    valid_until: "2026-06-15T11:59:59.000Z",
    coupon: {
      id: "coupon-1",
      code: "TEST",
      title: "测试券",
      type: "fixed",
      value: 20,
      min_amount: 100,
      start_date: "2026-06-01T00:00:00.000Z",
      end_date: "2026-06-06T16:00:00.000Z",
      status: "available",
    },
    ...overrides,
  };
}

describe("coupon display", () => {
  it("formats coupon expiry without the extra title prefix", () => {
    expect(formatCouponExpireText("2026-06-15T11:59:59.000Z")).toBe("2026.06.15 19:59 到期");
  });

  it("uses the user coupon validity deadline before the coupon template end date", () => {
    const display = userCouponToPremiumDisplay(userCoupon());

    expect(display.expireText).toBe("2026.06.15 19:59 到期");
  });
});
