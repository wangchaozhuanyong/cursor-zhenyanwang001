const assert = require('node:assert/strict');
const test = require('node:test');

const adminBannerService = require('../src/modules/admin/service/adminExtended.service');
const adminBannerRepo = require('../src/modules/admin/repository/adminExtended.repository');
const adminThemeController = require('../src/modules/admin/controller/adminTheme.controller');
const catalogService = require('../src/modules/product/service/catalog.service');
const catalogRepo = require('../src/modules/product/repository/catalog.repository');
const themeService = require('../src/modules/theme/service/theme.service');
const {
  FIXED_THEME_CONFIG,
  FIXED_THEME_ID,
  FIXED_THEME_PAYLOAD,
} = require('../src/modules/theme/theme.fixed');

process.env.AUDIT_LOG_DISABLED = '1';

function invokeController(handler, req = {}) {
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        resolve({ statusCode: this.statusCode, body });
        return this;
      },
    };
    handler(req, response, reject);
  });
}

test('public theme contract always returns the single fixed storefront design', async () => {
  const active = await themeService.getActiveThemeConfig();
  const skins = await themeService.getThemeSkins();

  assert.deepEqual(active, FIXED_THEME_CONFIG);
  assert.deepEqual(skins, FIXED_THEME_PAYLOAD);
  assert.equal(skins.activeSkinId, FIXED_THEME_ID);
  assert.equal(skins.runtimeSkinId, FIXED_THEME_ID);
  assert.equal(skins.skins.length, 1);
});

test('retired admin theme writes return an explicit gone response', async () => {
  const response = await invokeController(adminThemeController.retiredThemeWrite);

  assert.equal(response.statusCode, 410);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'THEME_STUDIO_RETIRED');
  assert.match(response.body.message, /固定设计/);
});

test('banner creation stores separate mobile and desktop assets with a legacy fallback', async (t) => {
  const originals = {
    insertBanner: adminBannerRepo.insertBanner,
    selectBannerById: adminBannerRepo.selectBannerById,
  };
  let inserted = null;
  adminBannerRepo.insertBanner = async (row) => {
    inserted = row;
  };
  adminBannerRepo.selectBannerById = async () => inserted;
  t.after(() => Object.assign(adminBannerRepo, originals));

  const result = await adminBannerService.createBanner({
    title: '城市好物',
    image_mobile: '/uploads/banner-mobile.webp',
    image_desktop: '/uploads/banner-desktop.webp',
  }, 'admin-1');

  assert.equal(result.error, undefined);
  assert.equal(inserted.image, '/uploads/banner-desktop.webp');
  assert.equal(inserted.image_mobile, '/uploads/banner-mobile.webp');
  assert.equal(inserted.image_desktop, '/uploads/banner-desktop.webp');
});

test('banner update cannot remove every image and repairs an empty legacy fallback', async (t) => {
  const originals = {
    selectBannerById: adminBannerRepo.selectBannerById,
    updateBannerByFields: adminBannerRepo.updateBannerByFields,
  };
  let updateCall = null;
  adminBannerRepo.selectBannerById = async () => ({
    id: 'banner-1',
    image: '',
    image_mobile: '/uploads/mobile.webp',
    image_desktop: '',
  });
  adminBannerRepo.updateBannerByFields = async (setFragments, values, id) => {
    updateCall = { setFragments, values, id };
  };
  t.after(() => Object.assign(adminBannerRepo, originals));

  const rejected = await adminBannerService.updateBanner('banner-1', {
    image: '',
    image_mobile: '',
    image_desktop: '',
  }, 'admin-1');
  assert.equal(rejected.error.code, 400);
  assert.equal(updateCall, null);

  const repaired = await adminBannerService.updateBanner('banner-1', {
    title: '城市好物',
  }, 'admin-1');
  assert.equal(repaired.error, undefined);
  const imageIndex = updateCall.setFragments.indexOf('image = ?');
  assert.notEqual(imageIndex, -1);
  assert.equal(updateCall.values[imageIndex], '/uploads/mobile.webp');
});

test('public banner response preserves responsive assets and sanitizes inline legacy images', async (t) => {
  const originalSelect = catalogRepo.selectActiveBanners;
  catalogRepo.selectActiveBanners = async () => [{
    id: 'banner-1',
    title: '城市好物',
    image: 'data:image/png;base64,AAAA',
    image_mobile: '/uploads/banner-mobile.webp',
    image_desktop: '/uploads/banner-desktop.webp',
    enabled: 1,
  }];
  t.after(() => {
    catalogRepo.selectActiveBanners = originalSelect;
    catalogService.clearCatalogCache();
  });
  catalogService.clearCatalogCache();

  const banners = await catalogService.getBanners();

  assert.equal(banners.length, 1);
  assert.equal(banners[0].image, '');
  assert.equal(banners[0].image_mobile, '/uploads/banner-mobile.webp');
  assert.equal(banners[0].image_desktop, '/uploads/banner-desktop.webp');
});
