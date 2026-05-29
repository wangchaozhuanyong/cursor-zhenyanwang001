import { get, post, put, del } from "@/api/request";
import type { Coupon } from "@/types/coupon";
import type { PaginatedData, PaginationParams } from "@/types/common";

export type CouponListParams = Partial<PaginationParams> & {
  keyword?: string;
  search?: string;
  publish_status?: string;
};

export type CouponRecordListParams = Partial<PaginationParams> & {
  keyword?: string;
  search?: string;
  status?: string;
};

export function getCoupons(params?: CouponListParams) {
  return get<PaginatedData<Coupon>>("/admin/coupons", params as unknown as Record<string, string>);
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

export function pauseCouponClaim(id: string) {
  return post<void>(`/admin/coupons/${id}/pause-claim`);
}

export function disableCouponUse(id: string) {
  return post<void>(`/admin/coupons/${id}/disable-use`);
}

export function archiveCoupon(id: string) {
  return post<void>(`/admin/coupons/${id}/archive`);
}

export function invalidateUserCoupons(id: string, reason?: string) {
  return post<{ affected: number }>(`/admin/coupons/${id}/invalidate-user-coupons`, { reason });
}

export function getCouponRecords(couponId: string, params?: CouponRecordListParams) {
  return get<PaginatedData<{ userId: string; claimedAt: string; usedAt?: string }>>(
    `/admin/coupons/${couponId}/records`,
    params as unknown as Record<string, string>
  );
}

export function getAllCouponRecords(params?: CouponRecordListParams) {
  return get<PaginatedData<Record<string, unknown>>>(
    "/admin/coupon-records",
    params as unknown as Record<string, string>,
  );
}

export function issueCouponByTag(couponId: string, tagIds: string[]) {
  return post<{ issued: number; targetUsers: number }>(`/admin/coupons/${couponId}/issue-by-tag`, { tagIds });
}
