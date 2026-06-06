const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function loadNewUserGiftServiceWithMocks(t, options = {}) {
  const couponCapabilityEnabled = options.couponEnabled !== false;
  const servicePath = require.resolve('../src/modules/marketing/service/newUserGift.service');
  const repoPath = require.resolve('../src/modules/marketing/repository/marketing.repository');
  const adminPath = require.resolve('../src/modules/admin');
  const userPath = require.resolve('../src/modules/user');
  const capabilitiesPath = require.resolve('../src/modules/siteCapabilities');

  for (const cachePath of [servicePath, repoPath, adminPath, userPath, capabilitiesPath]) {
    delete require.cache[cachePath];
  }

  const calls = {
    capability: 0,
    campaigns: 0,
    couponIds: 0,
    coupons: 0,
    issue: 0,
  };

  require.cache[capabilitiesPath] = {
    id: capabilitiesPath,
    filename: capabilitiesPath,
    loaded: true,
    exports: {
      api: {
        async isCapabilityEnabled(key) {
          assert.equal(key, 'couponEnabled');
          calls.capability += 1;
          return couponCapabilityEnabled;
        },
      },
    },
  };

  require.cache[adminPath] = {
    id: adminPath,
    filename: adminPath,
    loaded: true,
    exports: {
      api: {
        async selectPublicCouponCampaignsByPosition() {
          calls.campaigns += 1;
          return [{ id: 'campaign-1', campaign_type: 'new_user_gift' }];
        },
        async selectCouponCampaignCouponIds() {
          calls.couponIds += 1;
          return ['coupon-1'];
        },
      },
    },
  };

  require.cache[userPath] = {
    id: userPath,
    filename: userPath,
    loaded: true,
    exports: {
      api: {
        async issueCouponToUsers() {
          calls.issue += 1;
          return { issued: 1 };
        },
      },
    },
  };

  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      async selectCouponsByIds() {
        calls.coupons += 1;
        return [{ id: 'coupon-1' }];
      },
    },
  };

  t.after(() => {
    for (const cachePath of [servicePath, repoPath, adminPath, userPath, capabilitiesPath]) {
      delete require.cache[cachePath];
    }
  });

  return { service: require(servicePath), calls };
}

test('new user gift issuing is skipped when coupon capability is disabled', async (t) => {
  const { service, calls } = loadNewUserGiftServiceWithMocks(t, { couponEnabled: false });

  const issued = await service.issueNewUserGiftPack('user-1');

  assert.deepEqual(issued, []);
  assert.equal(calls.capability, 1);
  assert.equal(calls.campaigns, 0);
  assert.equal(calls.couponIds, 0);
  assert.equal(calls.coupons, 0);
  assert.equal(calls.issue, 0);
});

test('new user gift issuing still works when coupon capability is enabled', async (t) => {
  const { service, calls } = loadNewUserGiftServiceWithMocks(t, { couponEnabled: true });

  const issued = await service.issueNewUserGiftPack('user-1');

  assert.deepEqual(issued, [{ campaign_id: 'campaign-1', coupon_id: 'coupon-1' }]);
  assert.equal(calls.capability, 1);
  assert.equal(calls.campaigns, 1);
  assert.equal(calls.couponIds, 1);
  assert.equal(calls.coupons, 1);
  assert.equal(calls.issue, 1);
});

test('checkout coupon lookup route is guarded by coupon capability', () => {
  const routeFile = fs.readFileSync(
    path.join(__dirname, '../src/modules/order/routes/orders.routes.js'),
    'utf8',
  );

  assert.match(
    routeFile,
    /router\.post\('\/checkout\/coupons',\s*mallFeature,\s*couponFeature,\s*ctrl\.checkoutCoupons\)/,
  );
});
