const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadMarketingServiceWithMocks(t, options = {}) {
  const servicePath = require.resolve('../src/modules/marketing/service/marketing.service');
  const repoPath = require.resolve('../src/modules/marketing/repository/marketing.repository');
  const adminPath = require.resolve('../src/modules/admin');

  for (const cachePath of [servicePath, repoPath, adminPath]) {
    delete require.cache[cachePath];
  }

  const calls = {
    campaigns: 0,
    campaignCouponIds: 0,
    couponsByIds: 0,
    couponsByPosition: 0,
  };

  require.cache[adminPath] = {
    id: adminPath,
    filename: adminPath,
    loaded: true,
    exports: {
      api: {
        async selectPublicCouponCampaignsByPosition(position, types) {
          calls.campaigns += 1;
          assert.equal(position, 'home_coupon_zone');
          assert.ok(types.includes('public_claim'));
          return options.campaigns || [];
        },
        async selectCouponCampaignCouponIds(campaignId) {
          calls.campaignCouponIds += 1;
          return options.campaignCouponIds?.[campaignId] || [];
        },
      },
    },
  };

  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      async selectCouponsByIds(ids) {
        calls.couponsByIds += 1;
        return (options.couponsByIds || []).filter((coupon) => ids.includes(coupon.id));
      },
      async selectCouponsByPosition(position) {
        calls.couponsByPosition += 1;
        assert.equal(position, 'home_coupon_zone');
        return options.standaloneCoupons || [];
      },
      mapPublicCoupon(row) {
        return {
          id: row.id,
          code: row.code || row.id,
          title: row.title || row.id,
          type: row.type || 'fixed',
          value: Number(row.value || 1),
          min_amount: Number(row.min_amount || 0),
          start_date: row.start_date || '2026-01-01',
          end_date: row.end_date || '2026-12-31',
          description: row.description || '',
          scope_type: row.scope_type || 'all',
          display_badge: row.display_badge || '',
          category_ids: [],
        };
      },
    },
  };

  t.after(() => {
    for (const cachePath of [servicePath, repoPath, adminPath]) {
      delete require.cache[cachePath];
    }
  });

  return { service: require(servicePath), calls };
}

test('coupon zone exposes standalone published coupons when no campaign exists', async (t) => {
  const { service, calls } = loadMarketingServiceWithMocks(t, {
    standaloneCoupons: [{ id: 'coupon-standalone', title: 'Standalone coupon' }],
  });

  const result = await service.getCouponZone({ position: 'home_coupon_zone' });

  assert.deepEqual(result.data.coupons.map((coupon) => coupon.id), ['coupon-standalone']);
  assert.equal(result.data.campaigns.length, 0);
  assert.equal(calls.campaigns, 1);
  assert.equal(calls.campaignCouponIds, 0);
  assert.equal(calls.couponsByIds, 0);
  assert.equal(calls.couponsByPosition, 1);
});

test('coupon zone merges campaign coupons with standalone coupons without duplicates', async (t) => {
  const { service, calls } = loadMarketingServiceWithMocks(t, {
    campaigns: [{
      id: 'campaign-1',
      campaign_type: 'public_claim',
      title: 'Public campaign',
      start_at: '2026-01-01 00:00:00',
      end_at: '2026-12-31 23:59:59',
    }],
    campaignCouponIds: { 'campaign-1': ['coupon-a'] },
    couponsByIds: [{ id: 'coupon-a', title: 'Campaign coupon' }],
    standaloneCoupons: [
      { id: 'coupon-a', title: 'Duplicate coupon' },
      { id: 'coupon-b', title: 'Standalone coupon' },
    ],
  });

  const result = await service.getCouponZone({ position: 'home_coupon_zone' });

  assert.deepEqual(result.data.coupons.map((coupon) => coupon.id), ['coupon-a', 'coupon-b']);
  assert.deepEqual(result.data.campaigns[0].coupons.map((coupon) => coupon.id), ['coupon-a']);
  assert.equal(calls.campaigns, 1);
  assert.equal(calls.campaignCouponIds, 1);
  assert.equal(calls.couponsByIds, 1);
  assert.equal(calls.couponsByPosition, 1);
});
