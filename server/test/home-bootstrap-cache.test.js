const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadHomeServiceWithMocks(t, options = {}) {
  const couponCapabilityEnabled = options.couponEnabled !== false;
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
    couponZone: 0,
    couponCenter: 0,
    newUserGift: 0,
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
        async getCouponZone() {
          calls.couponZone += 1;
          return { data: { coupons: [{ id: 'zone-coupon' }] } };
        },
        async getCouponCenter() {
          calls.couponCenter += 1;
          return { data: { coupons: [{ id: 'gift-coupon' }, { id: 'center-coupon' }] } };
        },
        async getNewUserGift() {
          calls.newUserGift += 1;
          return { data: { coupons: [{ id: 'gift-coupon' }] } };
        },
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
          return { couponEnabled: couponCapabilityEnabled };
        },
        async isCapabilityEnabled(key) {
          assert.equal(key, 'couponEnabled');
          calls.couponEnabled += 1;
          return couponCapabilityEnabled;
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
  assert.equal(calls.couponZone, 1);
  assert.equal(calls.couponCenter, 0);
  assert.equal(calls.newUserGift, 0);
  assert.deepEqual(first.marketing.couponZone.coupons.map((coupon) => coupon.id), ['zone-coupon']);
  assert.equal(first.marketing.couponCenter, null);
  assert.equal(first.marketing.newUserGift, null);

  service.invalidateHomeBootstrapCache();
  await service.getHomeBootstrap();

  assert.equal(calls.siteInfo, 2);
});

test('home bootstrap omits coupon marketing blocks when coupon capability is disabled', async (t) => {
  const { service, calls } = loadHomeServiceWithMocks(t, { couponEnabled: false });

  const bootstrap = await service.getHomeBootstrap();

  assert.equal(calls.couponEnabled, 1);
  assert.equal(calls.couponZone, 0);
  assert.equal(calls.couponCenter, 0);
  assert.equal(calls.newUserGift, 0);
  assert.equal(bootstrap.marketing.couponZone, null);
  assert.equal(bootstrap.marketing.couponCenter, null);
  assert.equal(bootstrap.marketing.newUserGift, null);
});
