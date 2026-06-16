import { get } from "@/api/request";
import type { CouponClaimability } from "@/types/coupon";

export type FlashSaleHomeItem = {
  product_id: string;
  product_name: string;
  cover_image: string;
  original_price: number;
  flash_price: number;
  activity_stock: number;
  sold_count: number;
  remaining_stock: number;
  limit_per_user: number;
};

export type FlashSaleHomeActivity = {
  id: string;
  slug?: string;
  type: string;
  title: string;
  subtitle: string;
  cover_image: string;
  href?: string;
  start_at: string;
  end_at: string;
  countdown_seconds: number;
  items: FlashSaleHomeItem[];
};

export type PromotionType =
  | "campaign"
  | "coupon"
  | "full_reduction"
  | "full_discount"
  | "limited_time_discount"
  | "flash_sale"
  | "member_price"
  | "checkin_reward"
  | "points_reward";

export type StorefrontPromotionItem = {
  product_id: string;
  product_name: string;
  cover_image: string;
  product_price: number;
  product_stock: number;
  activity_price: number;
  activity_stock: number;
  sold_count: number;
  remaining_stock: number;
  limit_per_user: number;
  stock_progress_percent: number;
  sold_out: boolean;
  saving_amount: number;
  saving_percent: number;
};

export type StorefrontPromotionCoupon = CouponClaimability & {
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
  member_only?: boolean;
  new_user_only?: boolean;
  auto_issue?: boolean;
  per_user_limit?: number;
  total_quantity?: number;
  claimed_count?: number;
  source_campaign_id?: string;
};

export type StorefrontPromotion = {
  id: string;
  slug: string;
  type: PromotionType;
  legacy_type?: string;
  title: string;
  subtitle: string;
  description: string;
  cover_image: string;
  promo_label: string;
  start_at: string;
  end_at: string;
  priority: number;
  scope_type: string;
  display_positions: string[];
  rule_config: Record<string, unknown> | null;
  stackable: boolean;
  exclusive_with: PromotionType[];
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  version: number;
  runtime_status: "scheduled" | "active" | "ended";
  countdown_seconds: number;
  starts_in_seconds: number;
  href: string;
  items?: StorefrontPromotionItem[];
  scopes?: { scope_type: string; scope_id: string }[];
  coupons?: StorefrontPromotionCoupon[];
};

export type StorefrontPromotionList = {
  list: StorefrontPromotion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function getFlashSaleHome(position = "home_flash_sale") {
  return get<FlashSaleHomeActivity | null>("/marketing/activities/flash-sale", { position });
}

export function getPromotions(params?: { page?: number; pageSize?: number; type?: PromotionType | "" }) {
  return get<StorefrontPromotionList>("/marketing/promotions", params as Record<string, string | number | undefined>);
}

export function getPromotionBySlug(slug: string) {
  return get<StorefrontPromotion>(`/marketing/promotions/${encodeURIComponent(slug)}`);
}

export function getCouponCenter(position = "home_coupon_center") {
  return get<unknown>("/marketing/coupon-center", { position });
}

export function getNewUserGift(position = "home_new_user_gift") {
  return get<unknown>("/marketing/new-user-gift", { position });
}

export function getCouponZone(position = "home_coupon_zone") {
  return get<unknown>("/marketing/coupon-zone", { position });
}

export function getMarketingNotices(position: string) {
  return get<unknown[]>("/marketing/notices", { position });
}

export function getFullReductionNotices(position = "full_reduction_notice") {
  return get<unknown[]>("/marketing/full-reduction-notices", { position });
}
