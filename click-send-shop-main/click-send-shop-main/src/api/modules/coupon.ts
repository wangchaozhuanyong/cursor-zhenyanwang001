import { get, post } from "@/api/request";
import type { UserCoupon, CouponListParams } from "@/types/coupon";
import type { PaginatedData } from "@/types/common";

/** 401 不触发全局登出，由业务层决定刷新会话或跳转登录 */
const SILENT_AUTH_OPTIONS = { skipAuthRetry: true, suppressAuthExpired: true } as const;

export function getUserCoupons(params?: CouponListParams) {
  return get<PaginatedData<UserCoupon>>(
    "/coupons/mine",
    params as unknown as Record<string, string>,
    SILENT_AUTH_OPTIONS,
  );
}

export function claimCoupon(code: string, activityId?: string) {
  return post<UserCoupon>("/coupons/claim", { code, activity_id: activityId || undefined }, SILENT_AUTH_OPTIONS);
}

export function getAvailableCoupons(orderAmount: number) {
  return get<UserCoupon[]>("/coupons/available", { orderAmount: String(orderAmount) }, SILENT_AUTH_OPTIONS);
}
