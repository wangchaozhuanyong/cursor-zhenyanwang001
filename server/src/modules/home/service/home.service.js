const { getInstanceInfo, resolveSiteName } = require('../../../config/instance');
const { getStorageHealthReport } = require('../../../utils/objectStorage');

function getProductApi() {
  return /** @type {any} */ (require('../../product')).api || {};
}

function getMarketingApi() {
  return /** @type {any} */ (require('../../marketing')).api || {};
}

function getCapabilitiesApi() {
  return /** @type {any} */ (require('../../siteCapabilities')).api || {};
}

async function getHomeBootstrap() {
  const [siteInfo, siteCapabilities, homeOps, banners, categories, products, flashSale, promotionBanners, fullReductionNotices, couponCenter, newUserGift] = await Promise.all([
    getProductApi().getPublicSiteInfo(),
    getCapabilitiesApi().getSiteCapabilities(),
    getProductApi().getPublicHomeOps(),
    getProductApi().getBanners(),
    getProductApi().getCategories(),
    getProductApi().getHomeProducts(),
    getMarketingApi().getFlashSaleForHome({ position: 'home_flash_sale' }).then((r) => r.data).catch(() => null),
    getMarketingApi().getActivitiesByPosition({ position: 'home_promotion_banner', type: 'promotion_banner' }).then((r) => r.data).catch(() => []),
    getMarketingApi().getFullReductionNotices({ position: 'full_reduction_notice' }).then((r) => r.data).catch(() => []),
    getCapabilitiesApi().isCapabilityEnabled('couponEnabled').then((enabled) => (enabled
      ? getMarketingApi().getCouponCenter({ position: 'home_coupon_center' }).then((r) => r.data).catch(() => null)
      : null)),
    getMarketingApi().getNewUserGift({ position: 'home_new_user_gift' }).then((r) => r.data).catch(() => null),
  ]);
  const instance = getInstanceInfo();
  const storage = getStorageHealthReport();

  return {
    siteInfo,
    siteCapabilities,
    runtimeConfig: {
      siteCode: instance.siteCode,
      siteName: resolveSiteName(siteInfo),
      publicAppUrl: instance.publicAppUrl,
      features: siteCapabilities,
      upload: {
        storage: storage.mode,
        presignEnabled: storage.mode === 's3',
      },
    },
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

