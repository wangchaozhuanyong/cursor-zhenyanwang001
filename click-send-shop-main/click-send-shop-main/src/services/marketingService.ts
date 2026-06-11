import * as marketingApi from "@/api/modules/marketing";
import type { FlashSaleHomeActivity } from "@/api/modules/marketing";
import type { CouponClaimability } from "@/types/coupon";

export type MarketingCouponPublic = CouponClaimability & {
  id: string;
  code: string;
  title: string;
  type: string;
  value: number;
  min_amount: number;
  start_date: string;
  end_date: string;
  description: string;
  scope_type: string;
  display_badge: string;
  category_ids: string[];
  category_names?: string[];
  issue_activity_id?: string;
  campaign_id?: string;
  campaign_type?: string;
  member_only?: boolean;
  new_user_only?: boolean;
  auto_issue?: boolean;
  per_user_limit?: number;
  total_quantity?: number;
  claimed_count?: number;
  source_campaign_id?: string;
};

export type MarketingActivitySummary = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  cover_image: string;
  promo_label: string;
  start_at: string;
  end_at: string;
  link_url: string;
};

export type CouponCenterPayload = {
  activity: MarketingActivitySummary;
  coupons: MarketingCouponPublic[];
};

export type CouponZonePayload = {
  activity: MarketingActivitySummary | null;
  campaigns: Array<MarketingActivitySummary & {
    campaign_type?: string;
    issue_mode?: string;
    coupons?: MarketingCouponPublic[];
  }>;
  coupons: MarketingCouponPublic[];
};

export type NewUserGiftPayload = {
  activity: MarketingActivitySummary;
  coupons: MarketingCouponPublic[];
  auto_issue_on_register: boolean;
};

export async function fetchFlashSaleHome(position = "home_flash_sale") {
  const res = await marketingApi.getFlashSaleHome(position);
  return res.data;
}

export async function fetchCouponCenter(position = "home_coupon_center") {
  const res = await marketingApi.getCouponCenter(position);
  return res.data as CouponCenterPayload | null;
}

export async function fetchNewUserGift(position = "home_new_user_gift") {
  const res = await marketingApi.getNewUserGift(position);
  return res.data as NewUserGiftPayload | null;
}

export async function fetchCouponZone(position = "home_coupon_zone") {
  const res = await marketingApi.getCouponZone(position);
  return res.data as CouponZonePayload | null;
}

export async function fetchMarketingNotices(position: string) {
  const res = await marketingApi.getMarketingNotices(position);
  return (res.data || []) as MarketingActivitySummary[];
}

export async function fetchFullReductionNotices(position = "full_reduction_notice") {
  const res = await marketingApi.getFullReductionNotices(position);
  return (res.data || []) as MarketingActivitySummary[];
}

export type { FlashSaleHomeActivity };
