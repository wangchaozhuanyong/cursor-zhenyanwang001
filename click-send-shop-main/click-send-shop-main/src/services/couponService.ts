import * as couponApi from "@/api/modules/coupon";
import type { CouponCenterData, UserCoupon, CouponListParams } from "@/types/coupon";
import type { PaginatedData } from "@/types/common";

export async function fetchUserCoupons(
  params?: CouponListParams,
): Promise<PaginatedData<UserCoupon>> {
  const res = await couponApi.getUserCoupons(params);
  return res.data;
}

export async function fetchCouponCenter(): Promise<CouponCenterData> {
  const res = await couponApi.getCouponCenter();
  return res.data;
}

export async function claimCoupon(code: string, activityId?: string): Promise<UserCoupon> {
  const res = await couponApi.claimCoupon(code, activityId);
  return res.data;
}

export async function fetchAvailableCoupons(orderAmount: number): Promise<UserCoupon[]> {
  const res = await couponApi.getAvailableCoupons(orderAmount);
  return res.data;
}
