import { get, post, put, del } from "../request";
import type { Coupon } from "@/types/coupon";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getCoupons(params?: PaginationParams) {
  return get<PaginatedData<Coupon>>("/admin/coupons", params as Record<string, string>);
}

export function createCoupon(data: Omit<Coupon, "id" | "status">) {
  return post<Coupon>("/admin/coupons", data);
}

export function updateCoupon(id: string, data: Partial<Coupon>) {
  return put<Coupon>(`/admin/coupons/${id}`, data);
}

export function deleteCoupon(id: string) {
  return del<void>(`/admin/coupons/${id}`);
}

export function getCouponRecords(couponId: string, params?: PaginationParams) {
  return get<PaginatedData<{ userId: string; claimedAt: string; usedAt?: string }>>(
    `/admin/coupons/${couponId}/records`,
    params as Record<string, string>
  );
}

export function getAllCouponRecords(params?: PaginationParams) {
  return get<PaginatedData<Record<string, unknown>>>(
    "/admin/coupon-records",
    params as Record<string, string>,
  );
}
