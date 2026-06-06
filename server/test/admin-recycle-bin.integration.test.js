require('./setupTestEnv').requireTestDatabase();
require('./_dbCleanup.test');

const { after, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const { generateId } = require('../src/utils/helpers');
const couponRepo = require('../src/modules/admin/repository/adminCoupon.repository');
const campaignRepo = require('../src/modules/admin/repository/adminCouponCampaign.repository');
const recycleRepo = require('../src/modules/admin/repository/adminRecycleBin.repository');
const recycleService = require('../src/modules/admin/service/adminRecycleBin.service');

const originalAuditLogDisabled = process.env.AUDIT_LOG_DISABLED;
process.env.AUDIT_LOG_DISABLED = '1';

describe('admin recycle bin DB integration', () => {
  const ids = {
    couponId: '',
    campaignId: '',
  };

  after(async () => {
    try {
      if (ids.campaignId) {
        await db.query('DELETE FROM coupon_campaign_items WHERE BINARY campaign_id = BINARY ?', [ids.campaignId]).catch(() => {});
        await db.query('DELETE FROM coupon_campaign_audiences WHERE BINARY campaign_id = BINARY ?', [ids.campaignId]).catch(() => {});
        await db.query('DELETE FROM coupon_campaigns WHERE BINARY id = BINARY ?', [ids.campaignId]).catch(() => {});
      }
      if (ids.couponId) {
        await db.query('DELETE FROM coupons WHERE BINARY id = BINARY ?', [ids.couponId]).catch(() => {});
      }
    } finally {
      if (originalAuditLogDisabled === undefined) {
        delete process.env.AUDIT_LOG_DISABLED;
      } else {
        process.env.AUDIT_LOG_DISABLED = originalAuditLogDisabled;
      }
    }
  });

  test('lists, protects, and restores soft-deleted coupon campaigns', async () => {
    ids.couponId = generateId();
    ids.campaignId = generateId();
    const suffix = ids.couponId.slice(0, 8);

    await couponRepo.insertCoupon({
      id: ids.couponId,
      code: `RB-${suffix}`,
      title: `Recycle coupon ${suffix}`,
      type: 'amount',
      value: 5,
      min_amount: 0,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      description: 'recycle bin integration test',
      publish_status: 'active',
      issue_mode: 'manual',
    });

    await campaignRepo.insertCampaign({
      id: ids.campaignId,
      campaign_type: 'public_claim',
      title: `Recycle campaign ${suffix}`,
      subtitle: '',
      description: 'recycle bin integration test',
      start_at: '2026-01-01 00:00:00',
      end_at: '2026-12-31 23:59:59',
      status: 'active',
      disabled: 0,
      display_positions: ['home_coupon_zone'],
      audience_type: 'all',
      issue_mode: 'self_claim',
      adminUserId: 'test-admin',
    });
    await campaignRepo.replaceCampaignItems(ids.campaignId, [ids.couponId]);
    await campaignRepo.softDeleteCampaign(ids.campaignId, 'test-admin');

    const deletedPage = await recycleRepo.listDeletedPage({ type: 'coupon_campaigns', page: 1, pageSize: 20 });
    const deletedItem = deletedPage.list.find((item) => item.id === ids.campaignId);
    assert.ok(deletedItem, 'soft-deleted coupon campaign should appear in recycle bin');
    assert.equal(deletedItem.type, 'coupon_campaigns');
    assert.equal(Number(deletedItem.can_permanent_delete), 0);

    const permanentDeleteResult = await recycleService.permanentDelete('coupon_campaigns', ids.campaignId, 'test-admin');
    assert.equal(permanentDeleteResult.error.code, 400);

    const restoreResult = await recycleService.restoreItem('coupon_campaigns', ids.campaignId, 'test-admin');
    assert.equal(restoreResult.error, undefined);

    const restored = await campaignRepo.selectCampaignById(ids.campaignId);
    assert.ok(restored, 'restored coupon campaign should return to the campaign list');

    const afterRestorePage = await recycleRepo.listDeletedPage({ type: 'coupon_campaigns', page: 1, pageSize: 20 });
    assert.equal(afterRestorePage.list.some((item) => item.id === ids.campaignId), false);
  });
});
