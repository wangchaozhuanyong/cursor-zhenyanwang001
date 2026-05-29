import * as couponApi from "@/api/admin/coupon";
import type { Coupon, CouponClaimRecord, IssueCouponByTagResult } from "@/types/coupon";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export type CouponListParams = couponApi.CouponListParams;
export type CouponRecordListParams = couponApi.CouponRecordListParams;
export type CouponOperation = "pause-claim" | "disable-use" | "archive" | "invalidate-user-coupons";

export async function fetchCoupons(params?: CouponListParams): Promise<PaginatedData<Coupon>> {
  const res = await couponApi.getCoupons(params);
  return unwrapPaginated<Coupon>(res.data);
}

export async function createCoupon(data: Omit<Coupon, "id" | "status">) {
  const res = await couponApi.createCoupon(data);
  return res.data;
}

export async function updateCoupon(id: string, data: Partial<Coupon>) {
  const res = await couponApi.updateCoupon(id, data);
  return res.data;
}

export async function deleteCoupon(id: string) {
  await couponApi.deleteCoupon(id);
}

export async function operateCoupon(id: string, operation: CouponOperation, reason?: string) {
  if (operation === "pause-claim") {
    await couponApi.pauseCouponClaim(id);
    return null;
  }
  if (operation === "disable-use") {
    await couponApi.disableCouponUse(id);
    return null;
  }
  if (operation === "archive") {
    await couponApi.archiveCoupon(id);
    return null;
  }
  const res = await couponApi.invalidateUserCoupons(id, reason);
  return res.data;
}

export async function fetchCouponRecords(
  couponId?: string,
  params?: CouponRecordListParams,
): Promise<PaginatedData<CouponClaimRecord>> {
  if (couponId) {
    const res = await couponApi.getCouponRecords(couponId, params);
    return unwrapPaginated(res.data);
  }
  const res = await couponApi.getAllCouponRecords(params);
  return unwrapPaginated(res.data);
}

export async function issueCouponByTag(couponId: string, tagIds: string[]) {
  const res = await couponApi.issueCouponByTag(couponId, tagIds);
  return res.data as IssueCouponByTagResult;
}
