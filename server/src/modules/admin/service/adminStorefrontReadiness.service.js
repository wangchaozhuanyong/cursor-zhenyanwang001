const homeOpsService = require('./adminHomeOps.service');
const RESTRICTED_CATEGORY_KEYWORDS = [
  'tobacco', 'cigarette', 'cigar', 'smoking', 'vape', 'e-cigarette', 'nicotine',
  'alcohol', 'liquor', 'wine', 'beer', 'areca', 'betel',
  '槟榔', '烟', '香烟', '真烟', '电子烟', '尼古丁', '酒', '白酒', '啤酒', '红酒',
];

function getProductApi() {
  return /** @type {any} */ (require('../../product/publicApi')) || {};
}

function cleanText(value) {
  return String(value || '').trim();
}

function hasUsableMedia(value) {
  const media = cleanText(value);
  return !!media && !/^data:/i.test(media);
}

function collectRootCategories(categories) {
  return (Array.isArray(categories) ? categories : [])
    .filter((category) => !category?.parent_id);
}

function isRestrictedCategory(category) {
  const text = `${cleanText(category?.name)} ${cleanText(category?.description)}`.toLowerCase();
  return RESTRICTED_CATEGORY_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

function isEnabledFlag(value) {
  return value === true || value === 1 || String(value || '').trim() === '1';
}

function collectUniqueHomeProducts(products = {}) {
  const byId = new Map();
  const groups = [
    ['hot', products.hot],
    ['new_arrivals', products.new_arrivals],
    ['recommended', products.recommended],
  ];

  for (const [group, list] of groups) {
    for (const product of Array.isArray(list) ? list : []) {
      const id = cleanText(product?.id);
      if (!id) continue;
      const current = byId.get(id) || {
        ...product,
        id,
        groups: [],
      };
      if (!current.groups.includes(group)) current.groups.push(group);
      byId.set(id, current);
    }
  }

  return [...byId.values()];
}

function productHasEffectiveImage(product) {
  return [
    product?.cover_image,
    product?.image_url,
    product?.default_variant?.image_url,
  ].some(hasUsableMedia);
}

function buildStorefrontReadiness({ bootstrap = {}, navItems = [], checkedAt = new Date().toISOString() } = {}) {
  const home = /** @type {any} */ (bootstrap);
  const banners = Array.isArray(home.banners) ? home.banners : [];
  const missingBanners = banners
    .filter((banner) => !hasUsableMedia(banner?.image_mobile) || !hasUsableMedia(banner?.image_desktop))
    .map((banner) => ({
      id: cleanText(banner?.id),
      title: cleanText(banner?.title) || '未命名轮播图',
      missing_mobile: !hasUsableMedia(banner?.image_mobile),
      missing_desktop: !hasUsableMedia(banner?.image_desktop),
    }));

  const categories = collectRootCategories(home.categories);
  const categoriesNeedingReview = categories
    .filter((category) => category?.banner_enabled !== true || !hasUsableMedia(category?.banner_image_url))
    .map((category) => ({
      id: cleanText(category?.id),
      name: cleanText(category?.name) || '未命名分类',
      banner_enabled: category?.banner_enabled === true,
    }));

  const enabledNavItems = (Array.isArray(navItems) ? navItems : []).filter((item) => item?.enabled === true);
  const publicNavIds = new Set(
    (Array.isArray(home?.homeOps?.navItems) ? home.homeOps.navItems : [])
      .map((item) => cleanText(item?.id))
      .filter(Boolean),
  );
  const invalidNavItems = enabledNavItems
    .filter((item) => !publicNavIds.has(cleanText(item?.id)))
    .map((item) => ({
      id: cleanText(item?.id),
      title: cleanText(item?.title) || '未命名入口',
      target_type: cleanText(item?.target_type) || 'url',
    }));
  const externalNavItems = enabledNavItems
    .filter((item) => publicNavIds.has(cleanText(item?.id)) && /^https?:\/\//i.test(cleanText(item?.link_url)))
    .map((item) => ({
      id: cleanText(item?.id),
      title: cleanText(item?.title) || '未命名入口',
      link_url: cleanText(item?.link_url),
    }));

  const homeProducts = collectUniqueHomeProducts(home.products);
  const productsWithoutMedia = homeProducts
    .filter((product) => !productHasEffectiveImage(product))
    .map((product) => ({
      id: product.id,
      name: cleanText(product?.name) || '未命名商品',
      groups: product.groups,
    }));

  const restrictedCategories = categories
    .filter(isRestrictedCategory)
    .map((category) => ({
      id: cleanText(category?.id),
      name: cleanText(category?.name) || '未命名分类',
    }));
  const ageGateEnabled = isEnabledFlag(home?.siteInfo?.ageGateEnabled);
  const complianceBlockerCount = restrictedCategories.length > 0 && !ageGateEnabled ? 1 : 0;
  const blockerCount = missingBanners.length
    + invalidNavItems.length
    + productsWithoutMedia.length
    + complianceBlockerCount;
  const reviewCount = categoriesNeedingReview.length + externalNavItems.length;
  const checks = [
    missingBanners.length === 0,
    categoriesNeedingReview.length === 0,
    invalidNavItems.length === 0 && externalNavItems.length === 0,
    productsWithoutMedia.length === 0,
    complianceBlockerCount === 0,
  ];

  return {
    status: blockerCount > 0 ? 'not_ready' : reviewCount > 0 ? 'needs_review' : 'ready',
    checked_at: checkedAt,
    summary: {
      blocker_count: blockerCount,
      review_count: reviewCount,
      ready_check_count: checks.filter(Boolean).length,
      total_check_count: checks.length,
    },
    banners: {
      active_count: banners.length,
      missing_count: missingBanners.length,
      items: missingBanners,
    },
    categories: {
      visible_root_count: categories.length,
      review_count: categoriesNeedingReview.length,
      items: categoriesNeedingReview,
    },
    navigation: {
      enabled_count: enabledNavItems.length,
      invalid_count: invalidNavItems.length,
      external_review_count: externalNavItems.length,
      invalid_items: invalidNavItems,
      external_items: externalNavItems,
    },
    products: {
      home_count: homeProducts.length,
      missing_count: productsWithoutMedia.length,
      items: productsWithoutMedia,
    },
    compliance: {
      age_gate_enabled: ageGateEnabled,
      minimum_age: Math.max(1, Number(home?.siteInfo?.minimumAge) || 18),
      restricted_category_count: restrictedCategories.length,
      blocker_count: complianceBlockerCount,
      items: restrictedCategories,
    },
  };
}

async function getStorefrontReadiness() {
  const productApi = getProductApi();
  const requiredMethods = [
    'getBanners',
    'getCategories',
    'getHomeProducts',
    'getPublicHomeOps',
    'getPublicSiteInfo',
  ];
  if (requiredMethods.some((method) => typeof productApi[method] !== 'function')) {
    throw new Error('客户端内容接口不可用');
  }

  const [banners, categories, products, homeOps, siteInfo, navItems] = await Promise.all([
    productApi.getBanners(),
    productApi.getCategories(),
    productApi.getHomeProducts(),
    productApi.getPublicHomeOps(),
    productApi.getPublicSiteInfo(),
    homeOpsService.listNavItems(),
  ]);

  return buildStorefrontReadiness({
    bootstrap: { banners, categories, products, homeOps, siteInfo },
    navItems,
  });
}

module.exports = {
  buildStorefrontReadiness,
  collectUniqueHomeProducts,
  productHasEffectiveImage,
  getStorefrontReadiness,
};
