const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadMarketingServiceWithMocks(t, options = {}) {
  const servicePath = require.resolve('../src/modules/marketing/service/marketing.service');
  const repoPath = require.resolve('../src/modules/marketing/repository/marketing.repository');
  const adminPath = require.resolve('../src/modules/admin/publicApi');
  const userPath = require.resolve('../src/modules/user/publicApi');

  for (const cachePath of [servicePath, repoPath, adminPath, userPath]) {
    delete require.cache[cachePath];
  }

  const calls = {
    campaigns: 0,
    campaignCouponIds: 0,
    activities: 0,
    couponsByIds: 0,
    couponsByPosition: 0,
    promotionBySlug: 0,
  };

  require.cache[adminPath] = {
    id: adminPath,
    filename: adminPath,
    loaded: true,
    exports: {
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
  };

  require.cache[userPath] = {
    id: userPath,
    filename: userPath,
    loaded: true,
    exports: {
      async decorateCouponsWithClaimability(coupons, userId) {
        return coupons.map((coupon) => ({
          ...coupon,
          claimable: true,
          claim_status: 'claimable',
          claim_reason: userId ? '' : '登录后领取',
          requires_login: !userId,
        }));
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
      async selectActivitiesByPosition(position, types) {
        calls.activities += 1;
        assert.equal(position, options.activityPosition || 'home_coupon_center');
        assert.ok(types.includes('coupon'));
        assert.ok(types.includes('coupon_activity'));
        return options.activities || [];
      },
      async selectCouponsByPosition(position) {
        calls.couponsByPosition += 1;
        assert.equal(position, options.couponsByPosition || 'home_coupon_zone');
        return options.standaloneCoupons || [];
      },
      async selectActivePromotionBySlug(slug) {
        calls.promotionBySlug += 1;
        assert.equal(slug, options.promotionSlug || 'coupon-slug');
        return options.promotion || null;
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
    for (const cachePath of [servicePath, repoPath, adminPath, userPath]) {
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

test('promotion detail decorates coupon activity with claimable coupons', async (t) => {
  const { service, calls } = loadMarketingServiceWithMocks(t, {
    promotionSlug: 'coupon-slug',
    promotion: {
      id: 'activity-coupon-1',
      slug: 'coupon-slug',
      type: 'coupon',
      title: 'Coupon promotion',
      subtitle: 'Claim before checkout',
      start_at: '2026-01-01 00:00:00',
      end_at: '2026-12-31 23:59:59',
      priority: 10,
      rule_config: { coupon_ids: ['coupon-a', 'coupon-a', 'coupon-b'] },
      activity_config: { coupon_ids: ['coupon-a'] },
      display_positions: ['home_coupon_center'],
      exclusive_with: [],
    },
    couponsByIds: [
      { id: 'coupon-a', title: 'RM5 coupon', code: 'A5', value: 5, min_amount: 30 },
      { id: 'coupon-b', title: 'RM10 coupon', code: 'B10', value: 10, min_amount: 80 },
    ],
  });

  const result = await service.getPromotionBySlug('coupon-slug', { userId: 'user-1' });

  assert.equal(result.data.slug, 'coupon-slug');
  assert.equal(result.data.href, '/promotions/coupon-slug');
  assert.deepEqual(result.data.coupons.map((coupon) => coupon.id), ['coupon-a', 'coupon-b']);
  assert.deepEqual(result.data.coupons.map((coupon) => coupon.issue_activity_id), ['activity-coupon-1', 'activity-coupon-1']);
  assert.deepEqual(result.data.coupons.map((coupon) => coupon.claim_status), ['claimable', 'claimable']);
  assert.equal(calls.promotionBySlug, 1);
  assert.equal(calls.couponsByIds, 1);
});

test('promotion detail exposes runtime countdown and item stock metadata', async (t) => {
  const { service, calls } = loadMarketingServiceWithMocks(t, {
    promotionSlug: 'flash-slug',
    promotion: {
      id: 'activity-flash-1',
      slug: 'flash-slug',
      type: 'flash_sale',
      title: 'Flash promotion',
      subtitle: 'Limited stock',
      start_at: '2020-01-01 00:00:00',
      end_at: '2099-12-31 23:59:59',
      priority: 10,
      rule_config: {},
      display_positions: ['home_flash_sale'],
      exclusive_with: ['coupon'],
      items: [{
        product_id: 'product-1',
        product_name: 'Product 1',
        cover_image: '/p1.jpg',
        product_price: '100.00',
        product_stock: 20,
        activity_price: '80.00',
        activity_stock: 10,
        sold_count: 4,
        remaining_stock: 6,
        limit_per_user: 2,
      }, {
        product_id: 'product-2',
        product_name: 'Product 2',
        product_price: 50,
        product_stock: 0,
        activity_price: 45,
        activity_stock: 3,
        sold_count: 3,
        limit_per_user: 1,
      }],
    },
  });

  const result = await service.getPromotionBySlug('flash-slug', { userId: 'user-1' });

  assert.equal(result.data.runtime_status, 'active');
  assert.equal(result.data.countdown_seconds > 0, true);
  assert.equal(result.data.starts_in_seconds, 0);
  assert.deepEqual(result.data.exclusive_with, ['coupon']);
  assert.equal(result.data.items[0].stock_progress_percent, 40);
  assert.equal(result.data.items[0].saving_amount, 20);
  assert.equal(result.data.items[0].saving_percent, 20);
  assert.equal(result.data.items[0].sold_out, false);
  assert.equal(result.data.items[1].remaining_stock, 0);
  assert.equal(result.data.items[1].stock_progress_percent, 100);
  assert.equal(result.data.items[1].sold_out, true);
  assert.equal(calls.promotionBySlug, 1);
  assert.equal(calls.couponsByIds, 0);
});

test('coupon zone merges campaign coupons with standalone coupons without duplicates', async (t) => {
  const { service, calls } = loadMarketingServiceWithMocks(t, {
    campaigns: [{
      id: 'campaign-1',
      campaign_type: 'public_claim',
      title: 'Public campaign',
      display_category: 'member',
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
  assert.equal(result.data.coupons[0].display_category, 'member');
  assert.equal(result.data.campaigns[0].display_category, 'member');
  assert.deepEqual(result.data.campaigns[0].coupons.map((coupon) => coupon.id), ['coupon-a']);
  assert.equal(calls.campaigns, 1);
  assert.equal(calls.campaignCouponIds, 1);
  assert.equal(calls.couponsByIds, 1);
  assert.equal(calls.couponsByPosition, 1);
});

test('coupon center reads unified coupon activity before legacy coupon_activity fallback', async (t) => {
  const { service, calls } = loadMarketingServiceWithMocks(t, {
    couponsByPosition: 'home_coupon_center',
    activities: [{
      id: 'activity-1',
      type: 'coupon',
      title: 'Unified coupon activity',
      subtitle: 'Claim now',
      start_at: '2026-01-01 00:00:00',
      end_at: '2026-12-31 23:59:59',
      activity_config: { coupon_ids: ['coupon-a'] },
    }],
    couponsByIds: [{ id: 'coupon-a', title: 'Unified coupon' }],
    standaloneCoupons: [{ id: 'coupon-b', title: 'Standalone coupon' }],
  });

  const result = await service.getCouponCenter({ position: 'home_coupon_center' });

  assert.equal(result.data.activity.type, 'coupon');
  assert.equal(result.data.activity.link_url, '/coupons');
  assert.deepEqual(result.data.coupons.map((coupon) => coupon.id), ['coupon-a', 'coupon-b']);
  assert.equal(calls.campaigns, 1);
  assert.equal(calls.activities, 1);
  assert.equal(calls.campaignCouponIds, 0);
  assert.equal(calls.couponsByIds, 1);
  assert.equal(calls.couponsByPosition, 1);
});
