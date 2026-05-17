export const DISPLAY_POSITIONS = [
  "home_flash_sale",
  "home_coupon_center",
  "home_new_user_gift",
  "product_detail",
  "category_badge",
  "cart_notice",
  "checkout_notice",
  "profile_center",
  "promotion_banner",
] as const;

export type DisplayPosition = (typeof DISPLAY_POSITIONS)[number];

export const DISPLAY_POSITION_LABELS: Record<DisplayPosition, string> = {
  home_flash_sale: "首页秒杀专区",
  home_coupon_center: "首页领券中心",
  home_new_user_gift: "首页新人礼包",
  product_detail: "商品详情",
  category_badge: "分类角标",
  cart_notice: "购物车提示",
  checkout_notice: "结算页提示",
  profile_center: "个人中心",
  promotion_banner: "促销横幅",
};

export const PUBLISHABLE_ACTIVITY_TYPES = ["flash_sale", "full_reduction", "coupon_activity", "new_user_gift"] as const;
export const WIP_ACTIVITY_TYPES = ["member_activity", "points_bonus", "cashback_activity"] as const;

export function labelDisplayPositions(positions: string[] | undefined): string {
  if (!positions?.length) return "—";
  return positions.map((p) => DISPLAY_POSITION_LABELS[p as DisplayPosition] || p).join("、");
}
