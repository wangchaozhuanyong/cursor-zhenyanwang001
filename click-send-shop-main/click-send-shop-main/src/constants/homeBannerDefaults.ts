import type { Banner } from "@/types/banner";

export const HOME_BANNER_ASSET_REVISION = "fixed-responsive-v10-20260729";

export const DEFAULT_HOME_BANNERS: Banner[] = [
  {
    id: "fixed-home-customer-support",
    title: "中文客服确认中心",
    description: "订单咨询、信息确认、售后跟进，关键消息由专人协助。",
    cta_text: "联系客服",
    image: "/assets/fixed-storefront/home-banner-01-customer-support-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-01-customer-support-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-01-customer-support-desktop.webp",
    link: "/support-download?tab=support",
    sort_order: 1,
    enabled: true,
  },
  {
    id: "fixed-home-membership-benefits",
    title: "会员权益与奖励",
    description: "等级权益、积分记录、专属福利集中呈现，消费回馈更清楚。",
    cta_text: "查看会员",
    image: "/assets/fixed-storefront/home-banner-02-membership-benefits-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-02-membership-benefits-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-02-membership-benefits-desktop.webp",
    link: "/profile",
    sort_order: 2,
    enabled: true,
  },
  {
    id: "fixed-home-coupon-activity",
    title: "优惠券与限时活动",
    description: "新人券、活动券、满减提醒同步更新，下单前先领优惠。",
    cta_text: "领优惠券",
    image: "/assets/fixed-storefront/home-banner-03-coupon-activity-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-03-coupon-activity-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-03-coupon-activity-desktop.webp",
    link: "/coupons",
    sort_order: 3,
    enabled: true,
  },
  {
    id: "fixed-home-delivery-arrangement",
    title: "配送安排更透明",
    description: "地址、时段、路线节点和签收状态清晰跟进，收货更安心。",
    cta_text: "查看配送",
    image: "/assets/fixed-storefront/home-banner-04-delivery-arrangement-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-04-delivery-arrangement-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-04-delivery-arrangement-desktop.webp",
    link: "/content/shipping-policy",
    sort_order: 4,
    enabled: true,
  },
  {
    id: "fixed-home-local-stock",
    title: "本地现货优先",
    description: "本地库存、服务范围和补货状态前置展示，常用好物更快到手。",
    cta_text: "逛现货",
    image: "/assets/fixed-storefront/home-banner-05-local-stock-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-05-local-stock-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-05-local-stock-desktop.webp",
    link: "/categories",
    sort_order: 5,
    enabled: true,
  },
  {
    id: "fixed-home-china-selection",
    title: "中国优选采购",
    description: "筛选、确认、采购进度可视化，适合需要稳定补货的用户。",
    cta_text: "看优选",
    image: "/assets/fixed-storefront/home-banner-06-china-selection-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-06-china-selection-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-06-china-selection-desktop.webp",
    link: "/categories",
    sort_order: 6,
    enabled: true,
  },
  {
    id: "fixed-home-gift-selection",
    title: "礼品精选顾问",
    description: "礼品建议、贺卡信息和配送时间一起规划，送礼更体面。",
    cta_text: "挑礼品",
    image: "/assets/fixed-storefront/home-banner-07-gift-selection-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-07-gift-selection-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-07-gift-selection-desktop.webp",
    link: "/categories",
    sort_order: 7,
    enabled: true,
  },
];

const LEGACY_HOME_BANNER_IMAGES = new Set([
  "/assets/home-banners/home-hero-01-platform-bg.webp",
  "/assets/home-banners/home-hero-02-visa-study-bg.webp",
  "/assets/home-banners/home-hero-03-local-goods-bg.webp",
  "/assets/home-banners/home-hero-04-renovation-bg.webp",
  "/assets/home-banners/home-hero-05-support-bg.webp",
  "/assets/home-banners/home-hero-01-platform-bg-mobile.webp",
  "/assets/home-banners/home-hero-02-visa-study-bg-mobile.webp",
  "/assets/home-banners/home-hero-03-local-goods-bg-mobile.webp",
  "/assets/home-banners/home-hero-04-renovation-bg-mobile.webp",
  "/assets/home-banners/home-hero-05-support-bg-mobile.webp",
]);

const LEGACY_HOME_BANNER_TITLES = new Set([
  "大马通平台总览",
  "签证留学第二家园",
  "本地优选与中国好物",
  "商业装修服务",
  "本地中文客服与订单支持",
]);

export function resolveHomeBannerSet(list: Banner[]): Banner[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const responsiveBanners = list.filter(hasResponsiveHomeBannerMedia);
  if (responsiveBanners.length > 0) return responsiveBanners;
  const legacyCount = list.filter((item) => isLegacyHomeBanner(item)).length;
  if (legacyCount > 0 && legacyCount >= Math.min(3, list.length)) {
    return DEFAULT_HOME_BANNERS;
  }
  return DEFAULT_HOME_BANNERS;
}

function hasResponsiveHomeBannerMedia(item: Banner) {
  return Boolean(String(item?.image_mobile || "").trim() || String(item?.image_desktop || "").trim());
}

function isLegacyHomeBanner(item: Banner) {
  const image = String(item?.image || "").split("?")[0];
  const title = String(item?.title || "").trim();
  return LEGACY_HOME_BANNER_IMAGES.has(image) || LEGACY_HOME_BANNER_TITLES.has(title);
}
