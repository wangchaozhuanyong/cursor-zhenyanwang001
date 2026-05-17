const contentService = require('../product/content.service');
const catalogService = require('../product/catalog.service');
const marketingService = require('../marketing/marketing.service');

async function getHomeBootstrap() {
  const [siteInfo, homeOps, banners, categories, products, flashSale, promotionBanners, fullReductionNotices, couponCenter, newUserGift] = await Promise.all([
    contentService.getPublicSiteInfo(),
    contentService.getPublicHomeOps(),
    catalogService.getBanners(),
    catalogService.getCategories(),
    catalogService.getHomeProducts(),
    marketingService.getFlashSaleForHome({ position: 'home_flash_sale' }).then((r) => r.data).catch(() => null),
    marketingService.getActivitiesByPosition({ position: 'home_promotion_banner', type: 'promotion_banner' }).then((r) => r.data).catch(() => []),
    marketingService.getFullReductionNotices({ position: 'full_reduction_notice' }).then((r) => r.data).catch(() => []),
    marketingService.getCouponCenter({ position: 'home_coupon_center' }).then((r) => r.data).catch(() => null),
    marketingService.getNewUserGift({ position: 'home_new_user_gift' }).then((r) => r.data).catch(() => null),
  ]);

  return {
    siteInfo,
    homeOps,
    banners,
    categories,
    products: {
      hot: Array.isArray(products?.hot) ? products.hot : [],
      new_arrivals: Array.isArray(products?.new_arrivals) ? products.new_arrivals : [],
      recommended: Array.isArray(products?.recommended) ? products.recommended : [],
    },
    marketing: {
      flashSale,
      promotionBanners,
      fullReductionNotices,
      couponCenter,
      newUserGift,
    },
  };
}

module.exports = { getHomeBootstrap };
