import * as marketingApi from "@/api/modules/marketing";
import type { FlashSaleHomeActivity } from "@/api/modules/marketing";

export type MarketingCouponPublic = {
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

export async function fetchMarketingNotices(position: string) {
  const res = await marketingApi.getMarketingNotices(position);
  return (res.data || []) as MarketingActivitySummary[];
}

export async function fetchFullReductionNotices(position = "full_reduction_notice") {
  const res = await marketingApi.getFullReductionNotices(position);
  return (res.data || []) as MarketingActivitySummary[];
}

export type { FlashSaleHomeActivity };
