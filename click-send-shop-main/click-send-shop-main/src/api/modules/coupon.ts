import { get, post } from "../request";
import type { UserCoupon, CouponListParams } from "@/types/coupon";
import type { PaginatedData } from "@/types/common";

export function getUserCoupons(params?: CouponListParams) {
  return get<PaginatedData<UserCoupon>>("/coupons/mine", params as Record<string, string>);
}

export function claimCoupon(code: string) {
  return post<UserCoupon>("/coupons/claim", { code });
}

export function getAvailableCoupons(orderAmount: number) {
  return get<UserCoupon[]>("/coupons/available", {
    orderAmount: String(orderAmount),
  });
}
