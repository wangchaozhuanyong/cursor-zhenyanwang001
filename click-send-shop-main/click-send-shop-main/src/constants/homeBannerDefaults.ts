import type { Banner } from "@/types/banner";

export const HOME_BANNER_ASSET_REVISION = "webp-v7-20260629";

export const DEFAULT_HOME_BANNERS: Banner[] = [
  {
    id: "home-webp-v7-customer-support",
    title: "中文客服确认中心",
    description: "订单咨询、信息确认、售后跟进，关键消息由专人协助。",
    cta_text: "联系客服",
    image: "/assets/home-banners/home-hero-01-customer-support-bg.webp",
    link: "/support-download?tab=support",
    sort_order: 1,
    enabled: true,
  },
  {
    id: "home-webp-v7-membership-benefits",
    title: "会员权益与奖励",
    description: "等级权益、积分记录、专属福利集中呈现，消费回馈更清楚。",
    cta_text: "查看会员",
    image: "/assets/home-banners/home-hero-02-membership-benefits-bg.webp",
    link: "/profile",
    sort_order: 2,
    enabled: true,
  },
  {
    id: "home-webp-v7-coupon-activity",
    title: "优惠券与限时活动",
    description: "新人券、活动券、满减提醒同步更新，下单前先领优惠。",
    cta_text: "领优惠券",
    image: "/assets/home-banners/home-hero-03-coupon-activity-bg.webp",
    link: "/coupons",
    sort_order: 3,
    enabled: true,
  },
  {
    id: "home-webp-v7-delivery-arrangement",
    title: "配送安排更透明",
    description: "地址、时段、路线节点和签收状态清晰跟进，收货更安心。",
    cta_text: "查看配送",
    image: "/assets/home-banners/home-hero-04-delivery-arrangement-bg.webp",
    link: "/content/shipping-policy",
    sort_order: 4,
    enabled: true,
  },
  {
    id: "home-webp-v7-local-stock",
    title: "本地现货优先",
    description: "本地库存、服务范围和补货状态前置展示，常用好物更快到手。",
    cta_text: "逛现货",
    image: "/assets/home-banners/home-hero-05-local-stock-bg.webp",
    link: "/categories",
    sort_order: 5,
    enabled: true,
  },
  {
    id: "home-webp-v7-china-selection",
    title: "中国优选采购",
    description: "筛选、确认、采购进度可视化，适合需要稳定补货的用户。",
    cta_text: "看优选",
    image: "/assets/home-banners/home-hero-06-china-selection-bg.webp",
    link: "/categories",
    sort_order: 6,
    enabled: true,
  },
  {
    id: "home-webp-v7-gift-selection",
    title: "礼品精选顾问",
    description: "礼品建议、贺卡信息和配送时间一起规划，送礼更体面。",
    cta_text: "挑礼品",
    image: "/assets/home-banners/home-hero-07-gift-selection-bg.webp",
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
  const legacyCount = list.filter((item) => isLegacyHomeBanner(item)).length;
  if (legacyCount > 0 && legacyCount >= Math.min(3, list.length)) {
    return DEFAULT_HOME_BANNERS;
  }
  return list;
}

function isLegacyHomeBanner(item: Banner) {
  const image = String(item?.image || "").split("?")[0];
  const title = String(item?.title || "").trim();
  return LEGACY_HOME_BANNER_IMAGES.has(image) || LEGACY_HOME_BANNER_TITLES.has(title);
}
