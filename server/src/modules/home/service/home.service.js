const { getInstanceInfo, resolveSiteName } = require('../../../config/instance');
const { getStorageHealthReport } = require('../../../utils/objectStorage');
const { setCacheHit } = require('../../../utils/requestPerf');

const DEFAULT_HOME_BOOTSTRAP_CACHE_TTL_MS = 30_000;
const MAX_HOME_BOOTSTRAP_CACHE_TTL_MS = 5 * 60_000;

let cachedHomeBootstrap = null;
let cachedHomeBootstrapAt = 0;
let inflightHomeBootstrap = null;
let cachedHomeBootstrapLite = null;
let cachedHomeBootstrapLiteAt = 0;
let inflightHomeBootstrapLite = null;
let cachedHomeMarketing = null;
let cachedHomeMarketingAt = 0;
let inflightHomeMarketing = null;

function resolveCacheTtlMs() {
  const raw = Number(process.env.HOME_BOOTSTRAP_CACHE_TTL_MS);
  if (!Number.isFinite(raw)) return DEFAULT_HOME_BOOTSTRAP_CACHE_TTL_MS;
  if (raw <= 0) return 0;
  return Math.min(raw, MAX_HOME_BOOTSTRAP_CACHE_TTL_MS);
}

function getCachedHomeBootstrap() {
  const ttl = resolveCacheTtlMs();
  if (ttl <= 0 || !cachedHomeBootstrap) return null;
  if (Date.now() - cachedHomeBootstrapAt > ttl) return null;
  setCacheHit(true);
  return cachedHomeBootstrap;
}

function getCached(cacheValue, cacheAt) {
  const ttl = resolveCacheTtlMs();
  if (ttl <= 0 || !cacheValue) return null;
  if (Date.now() - cacheAt > ttl) return null;
  setCacheHit(true);
  return cacheValue;
}

function invalidateHomeBootstrapCache() {
  cachedHomeBootstrap = null;
  cachedHomeBootstrapAt = 0;
  inflightHomeBootstrap = null;
  cachedHomeBootstrapLite = null;
  cachedHomeBootstrapLiteAt = 0;
  inflightHomeBootstrapLite = null;
  cachedHomeMarketing = null;
  cachedHomeMarketingAt = 0;
  inflightHomeMarketing = null;
}

function getProductApi() {
  return /** @type {any} */ (require('../../product')).api || {};
}

function getMarketingApi() {
  return /** @type {any} */ (require('../../marketing')).api || {};
}

function getCapabilitiesApi() {
  return /** @type {any} */ (require('../../siteCapabilities')).api || {};
}

async function buildHomeBootstrap() {
  const couponEnabled = getCapabilitiesApi().isCapabilityEnabled('couponEnabled').catch(() => false);
  const [siteInfo, siteCapabilities, homeOps, banners, categories, products, flashSale, promotionBanners, fullReductionNotices, couponZone] = await Promise.all([
    getProductApi().getPublicSiteInfo(),
    getCapabilitiesApi().getSiteCapabilities(),
    getProductApi().getPublicHomeOps(),
    getProductApi().getBanners(),
    getProductApi().getCategories(),
    getProductApi().getHomeProducts(),
    getMarketingApi().getFlashSaleForHome({ position: 'home_flash_sale' }).then((r) => r.data).catch(() => null),
    getMarketingApi().getActivitiesByPosition({ position: 'promotion_banner' }).then((r) => r.data).catch(() => []),
    getMarketingApi().getFullReductionNotices({ position: 'full_reduction_notice' }).then((r) => r.data).catch(() => []),
    couponEnabled.then((enabled) => (enabled
      ? getMarketingApi().getCouponZone({ position: 'home_coupon_zone' }).then((r) => r.data).catch(() => null)
      : null)),
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
      couponZone,
      couponCenter: null,
      newUserGift: null,
    },
  };
}

async function buildHomeBootstrapLite() {
  const [siteInfo, siteCapabilities, homeOps, banners, categories, products] = await Promise.all([
    getProductApi().getPublicSiteInfo(),
    getCapabilitiesApi().getSiteCapabilities(),
    getProductApi().getPublicHomeOps(),
    getProductApi().getBannersLite ? getProductApi().getBannersLite(3) : getProductApi().getBanners(),
    getProductApi().getCategoriesLite ? getProductApi().getCategoriesLite() : getProductApi().getCategories(),
    getProductApi().getHomeProducts(),
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
    banners: Array.isArray(banners) ? banners.slice(0, 3) : [],
    categories,
    products: {
      hot: Array.isArray(products?.hot) ? products.hot : [],
      new_arrivals: Array.isArray(products?.new_arrivals) ? products.new_arrivals : [],
      recommended: Array.isArray(products?.recommended) ? products.recommended : [],
    },
    marketing: {
      flashSale: null,
      promotionBanners: [],
      fullReductionNotices: [],
      couponZone: null,
      couponCenter: null,
      newUserGift: null,
    },
  };
}

async function buildHomeMarketing() {
  const couponEnabled = getCapabilitiesApi().isCapabilityEnabled('couponEnabled').catch(() => false);
  const [flashSale, promotionBanners, fullReductionNotices, couponZone] = await Promise.all([
    getMarketingApi().getFlashSaleForHome({ position: 'home_flash_sale' }).then((r) => r.data).catch(() => null),
    getMarketingApi().getActivitiesByPosition({ position: 'promotion_banner' }).then((r) => r.data).catch(() => []),
    getMarketingApi().getFullReductionNotices({ position: 'full_reduction_notice' }).then((r) => r.data).catch(() => []),
    couponEnabled.then((enabled) => (enabled
      ? getMarketingApi().getCouponZone({ position: 'home_coupon_zone' }).then((r) => r.data).catch(() => null)
      : null)),
  ]);
  return {
    flashSale,
    promotionBanners,
    fullReductionNotices,
    couponZone,
    couponCenter: null,
    newUserGift: null,
  };
}

async function getHomeBootstrap(options = {}) {
  if (!options.force) {
    const cached = getCachedHomeBootstrap();
    if (cached) return cached;
    if (inflightHomeBootstrap) return inflightHomeBootstrap;
  }
  setCacheHit(false);

  inflightHomeBootstrap = buildHomeBootstrap()
    .then((data) => {
      if (resolveCacheTtlMs() > 0) {
        cachedHomeBootstrap = data;
        cachedHomeBootstrapAt = Date.now();
      }
      return data;
    })
    .finally(() => {
      inflightHomeBootstrap = null;
    });

  return inflightHomeBootstrap;
}

async function getHomeBootstrapLite(options = {}) {
  if (!options.force) {
    const cached = getCached(cachedHomeBootstrapLite, cachedHomeBootstrapLiteAt);
    if (cached) return cached;
    if (inflightHomeBootstrapLite) return inflightHomeBootstrapLite;
  }
  setCacheHit(false);

  inflightHomeBootstrapLite = buildHomeBootstrapLite()
    .then((data) => {
      if (resolveCacheTtlMs() > 0) {
        cachedHomeBootstrapLite = data;
        cachedHomeBootstrapLiteAt = Date.now();
      }
      return data;
    })
    .finally(() => {
      inflightHomeBootstrapLite = null;
    });

  return inflightHomeBootstrapLite;
}

async function getHomeMarketing(options = {}) {
  if (!options.force) {
    const cached = getCached(cachedHomeMarketing, cachedHomeMarketingAt);
    if (cached) return cached;
    if (inflightHomeMarketing) return inflightHomeMarketing;
  }
  setCacheHit(false);

  inflightHomeMarketing = buildHomeMarketing()
    .then((data) => {
      if (resolveCacheTtlMs() > 0) {
        cachedHomeMarketing = data;
        cachedHomeMarketingAt = Date.now();
      }
      return data;
    })
    .finally(() => {
      inflightHomeMarketing = null;
    });

  return inflightHomeMarketing;
}

module.exports = {
  getHomeBootstrap,
  getHomeBootstrapLite,
  getHomeMarketing,
  invalidateHomeBootstrapCache,
};
