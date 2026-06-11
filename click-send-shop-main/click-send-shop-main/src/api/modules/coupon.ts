import { get, post } from "@/api/request";
import type { CouponCenterData, UserCoupon, CouponListParams } from "@/types/coupon";
import type { PaginatedData } from "@/types/common";

/** 公开/静默读取：401 不触发全局登出，由业务层决定是否跳转登录 */
const SILENT_AUTH_OPTIONS = { skipAuthRetry: true, suppressAuthExpired: true } as const;
/** 需登录动作：允许 request 先 refresh 重试，但 refresh 失败也不由请求层强制登出 */
const AUTH_ACTION_OPTIONS = { suppressAuthExpired: true } as const;

export function getUserCoupons(params?: CouponListParams) {
  return get<PaginatedData<UserCoupon>>(
    "/coupons/mine",
    params as unknown as Record<string, string>,
    AUTH_ACTION_OPTIONS,
  );
}

export function getCouponCenter() {
  return get<CouponCenterData>("/coupons/center", undefined, SILENT_AUTH_OPTIONS);
}

export function claimCoupon(code: string, activityId?: string) {
  return post<UserCoupon>("/coupons/claim", { code, activity_id: activityId || undefined }, AUTH_ACTION_OPTIONS);
}

export function getAvailableCoupons(orderAmount: number) {
  return get<UserCoupon[]>("/coupons/available", { orderAmount: String(orderAmount) }, SILENT_AUTH_OPTIONS);
}
