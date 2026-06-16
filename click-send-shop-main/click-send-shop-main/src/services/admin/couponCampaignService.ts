import * as couponCampaignApi from "@/api/admin/couponCampaign";
import { unwrapPaginated } from "@/services/responseNormalize";
import type { PaginatedData } from "@/types/common";
import type { CouponCampaign, CouponCampaignPayload, CouponCampaignStatusAction } from "@/types/couponCampaign";

export type CouponCampaignListParams = couponCampaignApi.CouponCampaignListParams;

export async function fetchCouponCampaigns(params?: CouponCampaignListParams): Promise<PaginatedData<CouponCampaign>> {
  const res = await couponCampaignApi.getCouponCampaigns(params);
  return unwrapPaginated<CouponCampaign>(res.data);
}

export async function fetchCouponCampaign(id: string): Promise<CouponCampaign> {
  const res = await couponCampaignApi.getCouponCampaign(id);
  return res.data;
}

export async function createCouponCampaign(data: CouponCampaignPayload): Promise<CouponCampaign> {
  const res = await couponCampaignApi.createCouponCampaign(data);
  return res.data;
}

export async function updateCouponCampaign(id: string, data: Partial<CouponCampaignPayload>): Promise<CouponCampaign> {
  const res = await couponCampaignApi.updateCouponCampaign(id, data);
  return res.data;
}

export async function setCouponCampaignDisabled(id: string, disabled: boolean): Promise<CouponCampaign> {
  const res = await couponCampaignApi.updateCouponCampaignStatus(id, {
    disabled,
    status: disabled ? "disabled" : "active",
  });
  return res.data;
}

export async function updateCouponCampaignAction(
  id: string,
  action: CouponCampaignStatusAction,
): Promise<CouponCampaign> {
  const res = await couponCampaignApi.updateCouponCampaignStatus(id, { action });
  return res.data;
}

export async function deleteCouponCampaign(id: string) {
  await couponCampaignApi.deleteCouponCampaign(id);
}
