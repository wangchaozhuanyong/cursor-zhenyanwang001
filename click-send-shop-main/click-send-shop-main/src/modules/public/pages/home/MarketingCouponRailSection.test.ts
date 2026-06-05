import { describe, expect, it } from "vitest";
import { hasHomeCouponMarketingPayload } from "@/utils/homeCouponMarketing";
import type { CouponCenterPayload, CouponZonePayload, MarketingCouponPublic, NewUserGiftPayload } from "@/services/marketingService";

const coupon: MarketingCouponPublic = {
  id: "coupon-1",
  code: "WELCOME",
  title: "Welcome",
  type: "fixed",
  value: 5,
  min_amount: 0,
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  description: "",
  scope_type: "all",
  display_badge: "",
  category_ids: [],
};

const activity = {
  id: "activity-1",
  type: "coupon",
  title: "Coupons",
  subtitle: "",
  cover_image: "",
  promo_label: "",
  start_at: "2026-01-01",
  end_at: "2026-12-31",
  link_url: "",
};

describe("hasHomeCouponMarketingPayload", () => {
  it("returns false before marketing coupon data is ready", () => {
    expect(
      hasHomeCouponMarketingPayload({
        couponCenter: null,
        couponZone: null,
        newUserGift: null,
      }),
    ).toBe(false);
  });

  it("returns true when coupon center has coupons", () => {
    const couponCenter: CouponCenterPayload = {
      activity,
      coupons: [coupon],
    };

    expect(
      hasHomeCouponMarketingPayload({
        couponCenter,
        couponZone: null,
        newUserGift: null,
      }),
    ).toBe(true);
  });

  it("returns true when coupon zone campaigns have coupons", () => {
    const couponZone: CouponZonePayload = {
      activity: null,
      coupons: [],
      campaigns: [{ ...activity, campaign_type: "new_user_gift", coupons: [coupon] }],
    };

    expect(
      hasHomeCouponMarketingPayload({
        couponCenter: null,
        couponZone,
        newUserGift: null,
      }),
    ).toBe(true);
  });

  it("returns true when new user gift has coupons", () => {
    const newUserGift: NewUserGiftPayload = {
      activity,
      coupons: [coupon],
      auto_issue_on_register: true,
    };

    expect(
      hasHomeCouponMarketingPayload({
        couponCenter: null,
        couponZone: null,
        newUserGift,
      }),
    ).toBe(true);
  });
});
