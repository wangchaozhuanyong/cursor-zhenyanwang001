import type { CouponCenterPayload, CouponZonePayload, NewUserGiftPayload } from "@/services/marketingService";

export type HomeCouponMarketingPayloadState = {
  couponCenter: CouponCenterPayload | null;
  newUserGift: NewUserGiftPayload | null;
  couponZone: CouponZonePayload | null;
};

export function hasHomeCouponMarketingPayload(state: HomeCouponMarketingPayloadState) {
  return Boolean(
    state.couponZone?.coupons?.length
    || state.couponZone?.campaigns?.some((campaign) => campaign.coupons?.length)
    || state.couponCenter?.coupons?.length
    || state.newUserGift?.coupons?.length
  );
}
