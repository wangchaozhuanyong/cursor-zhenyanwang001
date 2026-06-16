const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');

const servicePath = require.resolve('../src/modules/admin/service/adminCouponCampaign.service');
const repoPath = require.resolve('../src/modules/admin/repository/adminCouponCampaign.repository');
const couponRepoPath = require.resolve('../src/modules/admin/repository/adminCoupon.repository');
const auditLogPath = require.resolve('../src/utils/auditLog');

function clearServiceCache() {
  for (const path of [servicePath, repoPath, couponRepoPath, auditLogPath]) {
    delete require.cache[path];
  }
}

afterEach(clearServiceCache);

function loadCouponCampaignService(options = {}) {
  clearServiceCache();
  let current = {
    id: 'campaign-1',
    campaign_type: 'public_claim',
    title: '领券活动',
    subtitle: '',
    description: '',
    cover_image: '',
    start_at: '2026-06-01 00:00:00',
    end_at: '2026-06-30 23:59:59',
    status: 'active',
    disabled: 0,
    display_positions: JSON.stringify(['home_coupon_zone']),
    display_category: '',
    audience_type: 'all',
    audience_config: null,
    issue_mode: 'self_claim',
    sort_order: 0,
    internal_note: '',
    coupon_count: 1,
    claimed_count: 0,
    used_count: 0,
    discount_total: 0,
    ...options.current,
  };
  const updates = [];
  let couponChecks = 0;

  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      parseJson(value, fallback) {
        if (value == null || value === '') return fallback;
        if (typeof value === 'object') return value;
        return JSON.parse(value);
      },
      async selectCampaignById(id) {
        assert.equal(id, 'campaign-1');
        return current;
      },
      async selectCampaignItems() {
        return [{ coupon_id: 'coupon-1' }];
      },
      async selectCampaignAudiences() {
        return [];
      },
      async updateCampaignDynamic(id, fragments, values) {
        assert.equal(id, 'campaign-1');
        updates.push({ fragments, values });
        fragments.forEach((fragment, index) => {
          const field = fragment.split('=')[0].trim();
          current = { ...current, [field]: values[index] };
        });
      },
      async replaceCampaignItems() {},
      async replaceCampaignAudiences() {},
    },
  };

  require.cache[couponRepoPath] = {
    id: couponRepoPath,
    filename: couponRepoPath,
    loaded: true,
    exports: {
      async selectCouponBaseById(couponId) {
        assert.equal(couponId, 'coupon-1');
        couponChecks += 1;
        return {
          id: couponId,
          status: 'available',
          publish_status: 'active',
          deleted_at: null,
          archived_at: null,
          invalidated_at: null,
          stop_claim_at: null,
          stop_use_at: null,
        };
      },
    },
  };

  require.cache[auditLogPath] = {
    id: auditLogPath,
    filename: auditLogPath,
    loaded: true,
    exports: {
      async writeAuditLog() {},
    },
  };

  return {
    service: require(servicePath),
    getCurrent: () => current,
    getUpdates: () => updates,
    getCouponChecks: () => couponChecks,
  };
}

test('coupon campaign pause and archive actions skip publish validation', async () => {
  const { service, getCurrent, getCouponChecks } = loadCouponCampaignService();

  const paused = await service.updateCampaignStatus('campaign-1', { action: 'pause' }, 'admin-1', {});
  assert.equal(paused.data.status, 'paused');
  assert.equal(getCurrent().status, 'paused');
  assert.equal(getCurrent().disabled, false);
  assert.equal(getCouponChecks(), 0);

  const archived = await service.updateCampaignStatus('campaign-1', { action: 'archive' }, 'admin-1', {});
  assert.equal(archived.data.status, 'archived');
  assert.equal(getCurrent().status, 'archived');
  assert.equal(getCurrent().disabled, true);
  assert.equal(getCouponChecks(), 0);
});

test('coupon campaign resume action revalidates coupons before publishing', async () => {
  const { service, getCurrent, getCouponChecks } = loadCouponCampaignService({
    current: { status: 'paused', disabled: 0 },
  });

  const resumed = await service.updateCampaignStatus('campaign-1', { action: 'resume' }, 'admin-1', {});

  assert.equal(resumed.data.status, 'active');
  assert.equal(getCurrent().status, 'active');
  assert.equal(getCurrent().disabled, false);
  assert.equal(getCouponChecks(), 1);
});

test('coupon campaign runtime status keeps archived separate from disabled', () => {
  const { service } = loadCouponCampaignService();

  assert.equal(service.runtimeStatus({
    status: 'archived',
    disabled: 1,
    start_at: '2026-06-01 00:00:00',
    end_at: '2026-06-30 23:59:59',
  }), 'archived');
});

test('coupon campaign update persists storefront display category', async () => {
  const { service, getCurrent, getUpdates } = loadCouponCampaignService();

  const updated = await service.updateCampaign('campaign-1', { display_category: 'member' }, 'admin-1', {});

  assert.equal(updated.data.display_category, 'member');
  assert.equal(getCurrent().display_category, 'member');
  assert.deepEqual(getUpdates()[0], {
    fragments: ['display_category = ?'],
    values: ['member'],
  });
});

test('coupon campaign update normalizes invalid display category to auto', async () => {
  const { service, getCurrent, getUpdates } = loadCouponCampaignService({
    current: { display_category: 'shipping' },
  });

  const updated = await service.updateCampaign('campaign-1', { display_category: 'unknown-category' }, 'admin-1', {});

  assert.equal(updated.data.display_category, '');
  assert.equal(getCurrent().display_category, '');
  assert.deepEqual(getUpdates()[0], {
    fragments: ['display_category = ?'],
    values: [''],
  });
});

test('coupon campaign new user gift defaults storefront display category to new user', async () => {
  const { service, getCurrent, getUpdates, getCouponChecks } = loadCouponCampaignService({
    current: { status: 'draft' },
  });

  const updated = await service.updateCampaign('campaign-1', { campaign_type: 'new_user_gift' }, 'admin-1', {});

  assert.equal(updated.data.campaign_type, 'new_user_gift');
  assert.equal(updated.data.audience_type, 'new_user');
  assert.equal(updated.data.issue_mode, 'auto_register');
  assert.equal(updated.data.display_category, 'new_user');
  assert.equal(getCurrent().display_category, 'new_user');
  assert.equal(getCouponChecks(), 0);
  assert.deepEqual(getUpdates()[0], {
    fragments: [
      'campaign_type = ?',
      'display_category = ?',
      'audience_type = ?',
      'issue_mode = ?',
    ],
    values: ['new_user_gift', 'new_user', 'new_user', 'auto_register'],
  });
});
