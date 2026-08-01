export type FixedHomeBannerRecommendation = {
  title: string;
  imageMobile: string;
  imageDesktop: string;
};

const FIXED_HOME_BANNER_RECOMMENDATIONS: FixedHomeBannerRecommendation[] = [
  {
    title: "中文客服确认中心",
    imageMobile: "/assets/fixed-storefront/home-banner-01-customer-support-mobile.webp",
    imageDesktop: "/assets/fixed-storefront/home-banner-01-customer-support-desktop.webp",
  },
  {
    title: "会员权益与奖励",
    imageMobile: "/assets/fixed-storefront/home-banner-02-membership-benefits-mobile.webp",
    imageDesktop: "/assets/fixed-storefront/home-banner-02-membership-benefits-desktop.webp",
  },
  {
    title: "优惠券与限时活动",
    imageMobile: "/assets/fixed-storefront/home-banner-03-coupon-activity-mobile.webp",
    imageDesktop: "/assets/fixed-storefront/home-banner-03-coupon-activity-desktop.webp",
  },
  {
    title: "配送安排更透明",
    imageMobile: "/assets/fixed-storefront/home-banner-04-delivery-arrangement-mobile.webp",
    imageDesktop: "/assets/fixed-storefront/home-banner-04-delivery-arrangement-desktop.webp",
  },
  {
    title: "本地现货优先",
    imageMobile: "/assets/fixed-storefront/home-banner-05-local-stock-mobile.webp",
    imageDesktop: "/assets/fixed-storefront/home-banner-05-local-stock-desktop.webp",
  },
  {
    title: "中国优选采购",
    imageMobile: "/assets/fixed-storefront/home-banner-06-china-selection-mobile.webp",
    imageDesktop: "/assets/fixed-storefront/home-banner-06-china-selection-desktop.webp",
  },
  {
    title: "礼品精选顾问",
    imageMobile: "/assets/fixed-storefront/home-banner-07-gift-selection-mobile.webp",
    imageDesktop: "/assets/fixed-storefront/home-banner-07-gift-selection-desktop.webp",
  },
];

const FIXED_HOME_BANNER_BY_TITLE = new Map(
  FIXED_HOME_BANNER_RECOMMENDATIONS.map((item) => [item.title, item]),
);

export function getFixedHomeBannerRecommendation(title: string | null | undefined) {
  return FIXED_HOME_BANNER_BY_TITLE.get(String(title || "").trim()) ?? null;
}

export { FIXED_HOME_BANNER_RECOMMENDATIONS };
