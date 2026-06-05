const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadHomeServiceWithMocks(t) {
  const servicePath = require.resolve('../src/modules/home/service/home.service');
  const productPath = require.resolve('../src/modules/product');
  const marketingPath = require.resolve('../src/modules/marketing');
  const capabilitiesPath = require.resolve('../src/modules/siteCapabilities');
  const instancePath = require.resolve('../src/config/instance');
  const storagePath = require.resolve('../src/utils/objectStorage');

  const previousTtl = process.env.HOME_BOOTSTRAP_CACHE_TTL_MS;
  process.env.HOME_BOOTSTRAP_CACHE_TTL_MS = '60000';

  for (const path of [servicePath, productPath, marketingPath, capabilitiesPath, instancePath, storagePath]) {
    delete require.cache[path];
  }

  const calls = {
    siteInfo: 0,
    siteCapabilities: 0,
    homeOps: 0,
    banners: 0,
    categories: 0,
    products: 0,
    couponEnabled: 0,
  };

  require.cache[productPath] = {
    id: productPath,
    filename: productPath,
    loaded: true,
    exports: {
      api: {
        async getPublicSiteInfo() {
          calls.siteInfo += 1;
          return { name: 'Demo Mall' };
        },
        async getPublicHomeOps() {
          calls.homeOps += 1;
          return { sections: [] };
        },
        async getBanners() {
          calls.banners += 1;
          return [];
        },
        async getCategories() {
          calls.categories += 1;
          return [];
        },
        async getHomeProducts() {
          calls.products += 1;
          return { hot: [], new_arrivals: [], recommended: [] };
        },
      },
    },
  };

  require.cache[marketingPath] = {
    id: marketingPath,
    filename: marketingPath,
    loaded: true,
    exports: {
      api: {
        async getFlashSaleForHome() { return { data: null }; },
        async getActivitiesByPosition() { return { data: [] }; },
        async getFullReductionNotices() { return { data: [] }; },
        async getCouponZone() { return { data: { coupons: [{ id: 'zone-coupon' }] } }; },
        async getCouponCenter() {
          return { data: { coupons: [{ id: 'gift-coupon' }, { id: 'center-coupon' }] } };
        },
        async getNewUserGift() { return { data: { coupons: [{ id: 'gift-coupon' }] } }; },
      },
    },
  };

  require.cache[capabilitiesPath] = {
    id: capabilitiesPath,
    filename: capabilitiesPath,
    loaded: true,
    exports: {
      api: {
        async getSiteCapabilities() {
          calls.siteCapabilities += 1;
          return { couponEnabled: true };
        },
        async isCapabilityEnabled(key) {
          assert.equal(key, 'couponEnabled');
          calls.couponEnabled += 1;
          return true;
        },
      },
    },
  };

  require.cache[instancePath] = {
    id: instancePath,
    filename: instancePath,
    loaded: true,
    exports: {
      getInstanceInfo: () => ({ siteCode: 'demo', publicAppUrl: 'https://example.test' }),
      resolveSiteName: (siteInfo) => siteInfo.name,
    },
  };

  require.cache[storagePath] = {
    id: storagePath,
    filename: storagePath,
    loaded: true,
    exports: {
      getStorageHealthReport: () => ({ mode: 'local' }),
    },
  };

  t.after(() => {
    if (previousTtl == null) {
      delete process.env.HOME_BOOTSTRAP_CACHE_TTL_MS;
    } else {
      process.env.HOME_BOOTSTRAP_CACHE_TTL_MS = previousTtl;
    }
    for (const path of [servicePath, productPath, marketingPath, capabilitiesPath, instancePath, storagePath]) {
      delete require.cache[path];
    }
  });

  return { service: require(servicePath), calls };
}

test('home bootstrap caches concurrent and repeated reads', async (t) => {
  const { service, calls } = loadHomeServiceWithMocks(t);

  const [first, second] = await Promise.all([
    service.getHomeBootstrap(),
    service.getHomeBootstrap(),
  ]);
  const third = await service.getHomeBootstrap();

  assert.equal(first, second);
  assert.equal(first, third);
  assert.equal(calls.siteInfo, 1);
  assert.equal(calls.homeOps, 1);
  assert.equal(calls.products, 1);
  assert.equal(calls.couponEnabled, 1);
  assert.deepEqual(first.marketing.couponCenter.coupons.map((coupon) => coupon.id), ['center-coupon']);

  service.invalidateHomeBootstrapCache();
  await service.getHomeBootstrap();

  assert.equal(calls.siteInfo, 2);
});
