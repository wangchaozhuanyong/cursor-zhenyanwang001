const { after, afterEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');

const originalAuditLogDisabled = process.env.AUDIT_LOG_DISABLED;
process.env.AUDIT_LOG_DISABLED = '1';

const db = require('../src/config/db');
const repo = require('../src/modules/admin/repository/adminRecycleBin.repository');
const productModule = require('../src/modules/product');
const homeService = require('../src/modules/home/service/home.service');
const service = require('../src/modules/admin/service/adminRecycleBin.service');

const originals = {
  listAllDeleted: repo.listAllDeleted,
  listDeletedItems: repo.listDeletedItems,
  getDeletedItem: repo.getDeletedItem,
  getCouponCampaignCouponIds: repo.getCouponCampaignCouponIds,
  getActiveCoupon: repo.getActiveCoupon,
  restoreItem: repo.restoreItem,
  permanentDeleteItem: repo.permanentDeleteItem,
  clearCatalogCache: productModule.api.clearCatalogCache,
  invalidateHomeBootstrapCache: homeService.invalidateHomeBootstrapCache,
};

afterEach(() => {
  repo.listAllDeleted = originals.listAllDeleted;
  repo.listDeletedItems = originals.listDeletedItems;
  repo.getDeletedItem = originals.getDeletedItem;
  repo.getCouponCampaignCouponIds = originals.getCouponCampaignCouponIds;
  repo.getActiveCoupon = originals.getActiveCoupon;
  repo.restoreItem = originals.restoreItem;
  repo.permanentDeleteItem = originals.permanentDeleteItem;
  productModule.api.clearCatalogCache = originals.clearCatalogCache;
  homeService.invalidateHomeBootstrapCache = originals.invalidateHomeBootstrapCache;
});

after(async () => {
  if (originalAuditLogDisabled === undefined) {
    delete process.env.AUDIT_LOG_DISABLED;
  } else {
    process.env.AUDIT_LOG_DISABLED = originalAuditLogDisabled;
  }
  await db.end();
});

describe('admin recycle bin coverage', () => {
  test('covers coupon campaigns without enabling unsafe permanent delete', () => {
    const config = repo.TABLE_CONFIGS.coupon_campaigns;

    assert.ok(config);
    assert.equal(config.label, '\u53d1\u5238\u6d3b\u52a8');
    assert.equal(config.hasDeletedBy, true);
    assert.equal(config.permanentDelete, false);
  });

  test('unsupported type filters return an empty page instead of all deleted items', async () => {
    const page = await repo.listDeletedPage({ type: 'activities', page: 1, pageSize: 20 });

    assert.deepEqual(page, {
      kind: 'paginate',
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  test('service unsupported type filters do not fall back to every deleted item', async () => {
    repo.listAllDeleted = async () => {
      throw new Error('should not list all deleted items for an unsupported type');
    };
    repo.listDeletedItems = async () => {
      throw new Error('should not query typed deleted items for an unsupported type');
    };

    const result = await service.listRecycleBin({ type: 'activities' });

    assert.deepEqual(result, []);
  });

  test('restores coupon campaigns only when linked coupons are active and clears public caches', async () => {
    const calls = {
      restore: 0,
      catalogCache: 0,
      homeCache: 0,
    };
    repo.getDeletedItem = async (type, id) => {
      assert.equal(type, 'coupon_campaigns');
      assert.equal(id, 'campaign-1');
      return { id, deleted_at: '2026-06-01T00:00:00.000Z' };
    };
    repo.getCouponCampaignCouponIds = async (campaignId) => {
      assert.equal(campaignId, 'campaign-1');
      return ['coupon-1'];
    };
    repo.getActiveCoupon = async (couponId) => {
      assert.equal(couponId, 'coupon-1');
      return { id: couponId };
    };
    repo.restoreItem = async (type, id) => {
      assert.equal(type, 'coupon_campaigns');
      assert.equal(id, 'campaign-1');
      calls.restore += 1;
      return true;
    };
    productModule.api.clearCatalogCache = () => {
      calls.catalogCache += 1;
    };
    homeService.invalidateHomeBootstrapCache = () => {
      calls.homeCache += 1;
    };

    const result = await service.restoreItem('coupon_campaigns', 'campaign-1', 'admin-1');

    assert.equal(result.error, undefined);
    assert.equal(calls.restore, 1);
    assert.equal(calls.catalogCache, 1);
    assert.equal(calls.homeCache, 1);
  });

  test('blocks coupon campaign restore when linked coupons are missing or archived', async () => {
    repo.getDeletedItem = async () => ({ id: 'campaign-1', deleted_at: '2026-06-01T00:00:00.000Z' });
    repo.getCouponCampaignCouponIds = async () => ['coupon-missing'];
    repo.getActiveCoupon = async () => null;
    repo.restoreItem = async () => {
      throw new Error('should not restore a campaign with invalid linked coupons');
    };

    const result = await service.restoreItem('coupon_campaigns', 'campaign-1', 'admin-1');

    assert.equal(result.error.code, 400);
  });

  test('keeps coupon campaigns unavailable for permanent delete', async () => {
    repo.permanentDeleteItem = async () => {
      throw new Error('should not call permanent delete for coupon campaigns');
    };

    const result = await service.permanentDelete('coupon_campaigns', 'campaign-1', 'admin-1');

    assert.equal(result.error.code, 400);
  });
});
