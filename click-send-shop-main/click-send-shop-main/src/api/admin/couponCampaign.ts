import { del, get, patch, post, put } from "@/api/request";
import type { PaginatedData, PaginationParams } from "@/types/common";
import type {
  CouponCampaign,
  CouponCampaignPayload,
  CouponCampaignStatus,
  CouponCampaignStatusAction,
  CouponCampaignType,
} from "@/types/couponCampaign";

export interface CouponCampaignListParams extends Partial<PaginationParams> {
  keyword?: string;
  campaign_type?: CouponCampaignType | "";
  status?: CouponCampaignStatus | "";
}

export function getCouponCampaigns(params?: CouponCampaignListParams) {
  return get<PaginatedData<CouponCampaign>>("/admin/coupon-campaigns", params as unknown as Record<string, unknown>);
}

export function getCouponCampaign(id: string) {
  return get<CouponCampaign>(`/admin/coupon-campaigns/${id}`);
}

export function createCouponCampaign(data: CouponCampaignPayload) {
  return post<CouponCampaign>("/admin/coupon-campaigns", data);
}

export function updateCouponCampaign(id: string, data: Partial<CouponCampaignPayload>) {
  return put<CouponCampaign>(`/admin/coupon-campaigns/${id}`, data);
}

export function updateCouponCampaignStatus(
  id: string,
  data: { status?: CouponCampaignStatus; disabled?: boolean; action?: CouponCampaignStatusAction },
) {
  return patch<CouponCampaign>(`/admin/coupon-campaigns/${id}/status`, data);
}

export function deleteCouponCampaign(id: string) {
  return del<void>(`/admin/coupon-campaigns/${id}`);
}
