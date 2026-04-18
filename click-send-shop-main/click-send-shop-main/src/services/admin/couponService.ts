import * as couponApi from "@/api/admin/coupon";
import type { Coupon } from "@/types/coupon";
import type { PaginatedData, PaginationParams } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchCoupons(params?: PaginationParams): Promise<PaginatedData<Coupon>> {
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

export async function fetchCouponRecords(
  couponId?: string,
  params?: PaginationParams,
): Promise<PaginatedData<Record<string, unknown>>> {
  if (couponId) {
    const res = await couponApi.getCouponRecords(couponId, params);
    return unwrapPaginated(res.data);
  }
  const res = await couponApi.getAllCouponRecords(params);
  return unwrapPaginated(res.data);
}
