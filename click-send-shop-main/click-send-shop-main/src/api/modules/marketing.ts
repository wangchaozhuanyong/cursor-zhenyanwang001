import { get } from "@/api/request";

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
  type: string;
  title: string;
  subtitle: string;
  cover_image: string;
  start_at: string;
  end_at: string;
  countdown_seconds: number;
  items: FlashSaleHomeItem[];
};

export function getFlashSaleHome(position = "home_flash_sale") {
  return get<FlashSaleHomeActivity | null>("/marketing/activities/flash-sale", { position });
}

export function getCouponCenter(position = "home_coupon_center") {
  return get<unknown>("/marketing/coupon-center", { position });
}

export function getNewUserGift(position = "home_new_user_gift") {
  return get<unknown>("/marketing/new-user-gift", { position });
}

export function getMarketingNotices(position: string) {
  return get<unknown[]>("/marketing/notices", { position });
}

export function getFullReductionNotices(position = "full_reduction_notice") {
  return get<unknown[]>("/marketing/full-reduction-notices", { position });
}
