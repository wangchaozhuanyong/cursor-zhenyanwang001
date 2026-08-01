const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildStorefrontReadiness,
  collectUniqueHomeProducts,
  productHasEffectiveImage,
} = require('../src/modules/admin/service/adminStorefrontReadiness.service');

function products(count, missingCount) {
  return Array.from({ length: count }, (_, index) => ({
    id: `product-${index + 1}`,
    name: `商品 ${index + 1}`,
    cover_image: index < missingCount ? '' : `/media/product-${index + 1}.webp`,
  }));
}

test('storefront readiness reproduces the fixed-client production blocker model', () => {
  const result = buildStorefrontReadiness({
    checkedAt: '2026-07-29T12:00:00.000Z',
    bootstrap: {
      banners: Array.from({ length: 7 }, (_, index) => ({
        id: `banner-${index + 1}`,
        title: `轮播 ${index + 1}`,
        image: `/legacy-${index + 1}.jpg`,
        image_mobile: '',
        image_desktop: '',
      })),
      categories: Array.from({ length: 7 }, (_, index) => ({
        id: `category-${index + 1}`,
        name: index === 6 ? '正品烟草' : `分类 ${index + 1}`,
        parent_id: null,
        banner_enabled: false,
        banner_image_url: '',
      })),
      siteInfo: {
        ageGateEnabled: '0',
        minimumAge: '18',
      },
      homeOps: {
        navItems: [
          ...Array.from({ length: 5 }, (_, index) => ({ id: `nav-valid-${index + 1}` })),
          { id: 'nav-external' },
        ],
      },
      products: {
        hot: products(48, 41),
        new_arrivals: products(8, 8),
        recommended: products(8, 8),
      },
    },
    navItems: [
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `nav-valid-${index + 1}`,
        title: `入口 ${index + 1}`,
        enabled: true,
        link_url: `/route-${index + 1}`,
      })),
      {
        id: 'nav-external',
        title: '外部邀请',
        enabled: true,
        link_url: 'https://example.com/invite',
      },
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `nav-invalid-${index + 1}`,
        title: `失效入口 ${index + 1}`,
        enabled: true,
        link_url: '',
      })),
    ],
  });

  assert.equal(result.status, 'not_ready');
  assert.equal(result.summary.blocker_count, 54);
  assert.equal(result.summary.review_count, 8);
  assert.equal(result.banners.missing_count, 7);
  assert.equal(result.categories.review_count, 7);
  assert.equal(result.navigation.invalid_count, 5);
  assert.equal(result.navigation.external_review_count, 1);
  assert.equal(result.products.home_count, 48);
  assert.equal(result.products.missing_count, 41);
  assert.equal(result.compliance.age_gate_enabled, false);
  assert.equal(result.compliance.restricted_category_count, 1);
  assert.equal(result.compliance.blocker_count, 1);
  assert.equal(result.checked_at, '2026-07-29T12:00:00.000Z');
});

test('storefront readiness accepts a variant image and de-duplicates repeated home products', () => {
  const repeated = {
    id: 'product-variant-image',
    name: '规格图商品',
    cover_image: '',
    default_variant: { image_url: '/variant.webp' },
  };
  const unique = collectUniqueHomeProducts({
    hot: [repeated],
    new_arrivals: [repeated],
    recommended: [{ ...repeated, id: 'product-missing', default_variant: null }],
  });

  assert.equal(unique.length, 2);
  assert.deepEqual(unique[0].groups, ['hot', 'new_arrivals']);
  assert.equal(productHasEffectiveImage(unique[0]), true);
  assert.equal(productHasEffectiveImage(unique[1]), false);
});

test('storefront readiness reports ready when every public surface has usable content', () => {
  const result = buildStorefrontReadiness({
    bootstrap: {
      banners: [{
        id: 'banner-ready',
        image_mobile: '/mobile.webp',
        image_desktop: '/desktop.webp',
      }],
      categories: [{
        id: 'category-ready',
        parent_id: null,
        banner_enabled: true,
        banner_image_url: '/category.webp',
      }],
      siteInfo: {
        ageGateEnabled: '1',
        minimumAge: '18',
      },
      homeOps: { navItems: [{ id: 'nav-ready' }] },
      products: {
        hot: [{ id: 'product-ready', cover_image: '/product.webp' }],
        new_arrivals: [],
        recommended: [],
      },
    },
    navItems: [{
      id: 'nav-ready',
      enabled: true,
      link_url: '/categories',
    }],
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.summary.blocker_count, 0);
  assert.equal(result.summary.review_count, 0);
  assert.equal(result.summary.ready_check_count, 5);
});
