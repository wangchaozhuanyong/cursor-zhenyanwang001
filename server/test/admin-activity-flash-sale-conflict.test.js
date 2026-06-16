const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');

const servicePath = require.resolve('../src/modules/admin/service/adminActivity.service');
const repoPath = require.resolve('../src/modules/admin/repository/adminActivity.repository');
const auditLogPath = require.resolve('../src/utils/auditLog');
const helpersPath = require.resolve('../src/utils/helpers');
const productModulePath = require.resolve('../src/modules/product/publicApi');

function clearActivityServiceCache() {
  for (const path of [servicePath, repoPath, auditLogPath, helpersPath, productModulePath]) {
    delete require.cache[path];
  }
}

function loadActivityServiceWithRepo(repoOverrides = {}) {
  clearActivityServiceCache();
  const calls = {
    selectConflictingActivities: 0,
  };
  let insertedActivity = null;
  let replacedItems = null;
  const auditLogs = [];

  const defaultRepo = {
    async selectProductStocksByIds() {
      return [];
    },
    async selectConflictingActivities() {
      calls.selectConflictingActivities += 1;
      return [];
    },
    async selectOverlappingActivitiesForRuleConflict() {
      return [];
    },
    async selectActiveCouponIdsByIds(ids) {
      return ids;
    },
    async insertActivity(params) {
      insertedActivity = params;
    },
    async replaceActivityItems(activityId, items) {
      replacedItems = { activityId, items };
    },
    async replaceActivityScopes() {},
    async setActivityRuntimeStatus() {
      return 1;
    },
    async selectActivityById(id) {
      if (!insertedActivity || insertedActivity.id !== id) return null;
      return {
        ...insertedActivity,
        display_positions: JSON.stringify(insertedActivity.display_positions || []),
        activity_config: insertedActivity.activity_config ? JSON.stringify(insertedActivity.activity_config) : null,
        product_count: 0,
        activity_stock_total: 0,
        sold_count_total: 0,
      };
    },
    async selectActivityItems() {
      return [];
    },
    async selectActivityScopes() {
      return [];
    },
  };

  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      ...defaultRepo,
      ...repoOverrides,
    },
  };
  require.cache[auditLogPath] = {
    id: auditLogPath,
    filename: auditLogPath,
    loaded: true,
    exports: {
      async writeAuditLog(entry) {
        auditLogs.push(entry);
      },
    },
  };
  let idSeq = 0;
  require.cache[helpersPath] = {
    id: helpersPath,
    filename: helpersPath,
    loaded: true,
    exports: {
      generateId() {
        idSeq += 1;
        return `test-id-${idSeq}`;
      },
    },
  };
  require.cache[productModulePath] = {
    id: productModulePath,
    filename: productModulePath,
    loaded: true,
    exports: {
      clearCatalogCache() {},
    },
  };

  return {
    service: require(servicePath),
    calls,
    auditLogs,
    getInsertedActivity: () => insertedActivity,
    getReplacedItems: () => replacedItems,
  };
}

function flashSalePayload(status = 'active') {
  return {
    type: 'flash_sale',
    title: '秒杀测试',
    start_at: '2026-06-08 10:00:00',
    end_at: '2026-06-09 10:00:00',
    status,
    display_positions: ['home_flash_sale'],
    items: [{
      product_id: 'product-1',
      activity_price: 50,
      activity_stock: 2,
      limit_per_user: 1,
    }],
  };
}

function couponActivityPayload(status = 'active') {
  return {
    type: 'coupon',
    title: '统一优惠券活动',
    start_at: '2026-06-08 10:00:00',
    end_at: '2026-06-09 10:00:00',
    status,
    scope_type: 'all',
    display_positions: ['home_coupon_center'],
    activity_config: { coupon_ids: ['coupon-1'] },
    rule_config: { coupon_ids: ['coupon-1'] },
    items: [],
  };
}

function fullDiscountPayload(status = 'active') {
  return {
    type: 'full_discount',
    title: '满折测试',
    start_at: '2026-06-08 10:00:00',
    end_at: '2026-06-09 10:00:00',
    status,
    scope_type: 'product',
    scope_ids: ['product-1'],
    display_positions: ['full_reduction_notice'],
    activity_config: { full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }] },
    rule_config: { full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }] },
    items: [],
  };
}

function memberPricePayload(status = 'active') {
  return {
    type: 'member_price',
    title: '会员价测试',
    start_at: '2026-06-08 10:00:00',
    end_at: '2026-06-09 10:00:00',
    status,
    scope_type: 'product',
    scope_ids: ['product-1'],
    display_positions: ['product_detail'],
    activity_config: { member_price_rules: [{ discount_percent: 95, min_order_amount: 0, member_level_ids: [] }] },
    rule_config: { member_price_rules: [{ discount_percent: 95, min_order_amount: 0, member_level_ids: [] }] },
    items: [],
  };
}

function checkinRewardPayload(status = 'active') {
  return {
    type: 'checkin_reward',
    title: '每日签到奖励',
    start_at: '2026-06-08 10:00:00',
    end_at: '2026-06-09 10:00:00',
    status,
    scope_type: 'all',
    display_positions: ['profile_center'],
    activity_config: { bonus_kind: 'checkin', reward_points: 8, once_per_day: true },
    rule_config: { bonus_kind: 'checkin', reward_points: 8, once_per_day: true },
    items: [],
  };
}

afterEach(() => {
  clearActivityServiceCache();
});

test('flash sale publish validation returns a Chinese conflict business error', async () => {
  const { service } = loadActivityServiceWithRepo({
    async selectProductStocksByIds() {
      return [{
        id: 'product-1',
        name: '测试商品',
        stock: 10,
        price: 100,
        lifecycle_status: 1,
      }];
    },
    async selectConflictingActivities() {
      return [{
        product_id: 'product-1',
        title: '热舞热',
      }];
    },
  });

  await assert.rejects(
    () => service.validateActivityBeforePublish(flashSalePayload('active')),
    (err) => {
      assert.equal(err.name, 'BusinessError');
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /测试商品/);
      assert.match(err.message, /热舞热/);
      assert.match(err.message, /调整活动时间或更换商品/);
      return true;
    },
  );
});

test('publish validation blocks v2 exclusive activity conflict', async () => {
  const { service } = loadActivityServiceWithRepo({
    async selectProductStocksByIds() {
      return [{
        id: 'product-1',
        name: '测试商品',
        stock: 10,
        price: 100,
        lifecycle_status: 1,
      }];
    },
    async selectOverlappingActivitiesForRuleConflict() {
      return [{
        activity_id: 'full-1',
        title: '满减冲突活动',
        type: 'full_reduction',
        scope_type: 'product',
        stackable: 1,
        exclusive_with: JSON.stringify([]),
        row_scope_type: 'product',
        scope_id: 'product-1',
      }];
    },
  });

  await assert.rejects(
    () => service.validateActivityBeforePublish({
      ...flashSalePayload('active'),
      stackable: true,
      exclusive_with: ['full_reduction'],
    }),
    (err) => {
      assert.equal(err.name, 'BusinessError');
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /不可与“full_reduction”叠加/);
      assert.match(err.message, /满减冲突活动/);
      return true;
    },
  );
});

test('publish validation blocks overlapping order-discount activity family by default', async () => {
  const { service } = loadActivityServiceWithRepo({
    async selectOverlappingActivitiesForRuleConflict() {
      return [{
        activity_id: 'full-1',
        title: '满减冲突活动',
        type: 'full_reduction',
        scope_type: 'product',
        stackable: 1,
        exclusive_with: JSON.stringify([]),
        row_scope_type: 'product',
        scope_id: 'product-1',
        activity_config: JSON.stringify({
          full_reduction_rules: [{ threshold_amount: 100, discount_amount: 10 }],
        }),
      }];
    },
  });

  await assert.rejects(
    () => service.validateActivityBeforePublish(fullDiscountPayload('active')),
    (err) => {
      assert.equal(err.name, 'BusinessError');
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /同属满减\/满折优惠计算层/);
      assert.match(err.message, /满减冲突活动/);
      return true;
    },
  );
});

test('publish validation allows same order-discount family only when both sides explicitly allow it', async () => {
  const { service } = loadActivityServiceWithRepo({
    async selectOverlappingActivitiesForRuleConflict() {
      return [{
        activity_id: 'full-1',
        title: '满减可叠加活动',
        type: 'full_reduction',
        scope_type: 'product',
        stackable: 1,
        exclusive_with: JSON.stringify([]),
        row_scope_type: 'product',
        scope_id: 'product-1',
        activity_config: JSON.stringify({
          allow_same_family_stack: true,
          full_reduction_rules: [{ threshold_amount: 100, discount_amount: 10 }],
        }),
      }];
    },
  });

  await assert.doesNotReject(() => service.validateActivityBeforePublish({
    ...fullDiscountPayload('active'),
    activity_config: {
      allow_same_family_stack: true,
      full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }],
    },
    rule_config: {
      allow_same_family_stack: true,
      full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }],
    },
  }));
});

test('publish validation still blocks same family when only the new activity allows stacking', async () => {
  const { service } = loadActivityServiceWithRepo({
    async selectOverlappingActivitiesForRuleConflict() {
      return [{
        activity_id: 'full-1',
        title: '满减未确认叠加活动',
        type: 'full_reduction',
        scope_type: 'product',
        stackable: 1,
        exclusive_with: JSON.stringify([]),
        row_scope_type: 'product',
        scope_id: 'product-1',
        activity_config: JSON.stringify({
          full_reduction_rules: [{ threshold_amount: 100, discount_amount: 10 }],
        }),
      }];
    },
  });

  await assert.rejects(
    () => service.validateActivityBeforePublish({
      ...fullDiscountPayload('active'),
      activity_config: {
        allow_same_family_stack: true,
        full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }],
      },
      rule_config: {
        allow_same_family_stack: true,
        full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }],
      },
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /满减未确认叠加活动/);
      return true;
    },
  );
});

test('precheck returns structured blocking issue for same family conflicts', async () => {
  const { service } = loadActivityServiceWithRepo({
    async selectOverlappingActivitiesForRuleConflict() {
      return [{
        activity_id: 'full-1',
        title: '满减预检冲突',
        type: 'full_reduction',
        scope_type: 'product',
        stackable: 1,
        exclusive_with: JSON.stringify([]),
        row_scope_type: 'product',
        scope_id: 'product-1',
      }];
    },
  });

  const result = await service.precheckActivityBeforePublish(fullDiscountPayload('active'));

  assert.equal(result.data.ok, false);
  assert.equal(result.data.blocking[0].code, 'same_family_conflict');
  assert.equal(result.data.blocking[0].conflict_activity_title, '满减预检冲突');
  assert.match(result.data.blocking[0].message, /满减预检冲突/);
  assert.equal(result.data.snapshot.type, 'full_discount');
  assert.equal(result.data.snapshot.target_status, 'active');
  assert.equal(result.data.snapshot.scope_type, 'product');
  assert.equal(result.data.snapshot.scope_count, 1);
  assert.equal(result.data.snapshot.rule_summary, '满折规则 1 条');
});

test('precheck can validate an existing activity by id without a full frontend payload', async () => {
  const { service } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      assert.equal(id, 'activity-1');
      return {
        id: 'activity-1',
        ...flashSalePayload('active'),
        disabled: 0,
        sort_order: 0,
        priority: 0,
        stackable: 1,
        exclusive_with: JSON.stringify([]),
        allow_coupon_stack: 1,
        allow_points_stack: 1,
        allow_reward: 0,
        display_positions: JSON.stringify(['home_flash_sale']),
        activity_config: JSON.stringify({}),
        rule_config: JSON.stringify({}),
        version: 3,
        product_count: 1,
        activity_stock_total: 2,
        sold_count_total: 0,
      };
    },
    async selectActivityItems() {
      return [{
        id: 'item-1',
        product_id: 'product-1',
        activity_price: 50,
        activity_stock: 2,
        sold_count: 0,
        limit_per_user: 1,
        sort_order: 0,
      }];
    },
    async selectProductStocksByIds() {
      return [{
        id: 'product-1',
        name: '测试商品',
        stock: 10,
        price: 100,
        lifecycle_status: 1,
      }];
    },
    async selectConflictingActivities() {
      return [{
        product_id: 'product-1',
        title: '同商品活动',
      }];
    },
  });

  const result = await service.precheckActivityBeforePublish({}, 'activity-1');

  assert.equal(result.data.ok, false);
  assert.equal(result.data.blocking[0].code, 'activity_product_error');
  assert.match(result.data.blocking[0].message, /同商品活动/);
  assert.equal(result.data.snapshot.activity_id, 'activity-1');
  assert.equal(result.data.snapshot.rule_version, 3);
  assert.equal(result.data.snapshot.item_count, 1);
  assert.equal(result.data.snapshot.rule_summary, '活动价商品规则');
});

test('precheck returns ok with an info warning when publish checks pass', async () => {
  const { service } = loadActivityServiceWithRepo();

  const result = await service.precheckActivityBeforePublish(fullDiscountPayload('active'));

  assert.equal(result.data.ok, true);
  assert.equal(result.data.blocking.length, 0);
  assert.equal(result.data.warnings[0].severity, 'info');
  assert.equal(result.data.snapshot.rule_summary, '满折规则 1 条');
  assert.deepEqual(result.data.snapshot.display_positions, ['full_reduction_notice']);
});

test('creating a flash sale draft does not run product time-window conflict validation', async () => {
  const { service, calls, getInsertedActivity } = loadActivityServiceWithRepo({
    async selectConflictingActivities() {
      calls.selectConflictingActivities += 1;
      throw new Error('draft should not validate conflicts');
    },
  });

  const result = await service.createActivity(flashSalePayload('draft'), 'admin-1', {});

  assert.equal(calls.selectConflictingActivities, 0);
  assert.equal(getInsertedActivity().status, 'draft');
  assert.equal(result.data.status, 'draft');
});

test('creating activity preserves v2 rule limits and stacking config', async () => {
  const { service, getInsertedActivity } = loadActivityServiceWithRepo();

  const result = await service.createActivity({
    ...flashSalePayload('draft'),
    slug: 'daily-flash',
    priority: 8,
    stackable: false,
    exclusive_with: ['coupon', 'full_reduction'],
    usage_limit_total: 100,
    usage_limit_per_user: 1,
    activity_config: { tag: 'daily' },
  }, 'admin-1', {});

  assert.equal(getInsertedActivity().slug, 'daily-flash');
  assert.equal(getInsertedActivity().priority, 8);
  assert.equal(getInsertedActivity().stackable, false);
  assert.deepEqual(getInsertedActivity().exclusive_with, ['coupon', 'full_reduction']);
  assert.equal(getInsertedActivity().usage_limit_total, 100);
  assert.equal(getInsertedActivity().usage_limit_per_user, 1);
  assert.deepEqual(result.data.rule_config, { tag: 'daily' });
});

test('creating a copied activity regenerates item ids and resets sold counts', async () => {
  const { service, getReplacedItems } = loadActivityServiceWithRepo();

  await service.createActivity({
    ...flashSalePayload('draft'),
    items: [{
      id: 'source-item-1',
      product_id: 'product-1',
      activity_price: 50,
      activity_stock: 8,
      limit_per_user: 1,
      sold_count: 6,
    }],
  }, 'admin-1', {});

  const replaced = getReplacedItems();
  assert.ok(replaced);
  assert.notEqual(replaced.items[0].id, 'source-item-1');
  assert.match(replaced.items[0].id, /^test-id-/);
  assert.equal(replaced.items[0].sold_count, 0);
});

test('copyActivity creates a draft clone with reset slug version items and audit log', async () => {
  let insertedActivity = null;
  let replacedItems = null;
  let replacedScopes = null;
  const sourceRow = {
    id: 'source-activity',
    slug: 'daily-flash',
    type: 'flash_sale',
    title: '每日秒杀',
    subtitle: '限时',
    cover_image: '/cover.jpg',
    description: 'source description',
    start_at: '2026-06-08 10:00:00',
    end_at: '2099-06-09 10:00:00',
    status: 'active',
    disabled: 0,
    threshold_amount: null,
    discount_amount: null,
    scope_type: 'product',
    allow_coupon_stack: 0,
    allow_points_stack: 1,
    allow_reward: 1,
    internal_note: 'internal',
    display_positions: JSON.stringify(['home_flash_sale']),
    activity_config: JSON.stringify({ tag: 'daily' }),
    rule_config: JSON.stringify({ tag: 'daily' }),
    stackable: 0,
    exclusive_with: JSON.stringify(['coupon']),
    usage_limit_total: 100,
    usage_limit_per_user: 1,
    sort_order: 5,
    priority: 8,
    version: 7,
  };
  const sourceItems = [{
    id: 'source-item-1',
    activity_id: 'source-activity',
    product_id: 'product-1',
    activity_price: 50,
    activity_stock: 8,
    limit_per_user: 1,
    sold_count: 6,
    sort_order: 0,
  }];
  const sourceScopes = [{
    id: 'source-scope-1',
    activity_id: 'source-activity',
    scope_type: 'product',
    scope_id: 'product-1',
  }];
  const { service, auditLogs } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      if (id === 'source-activity') return sourceRow;
      if (insertedActivity && insertedActivity.id === id) {
        return {
          ...insertedActivity,
          display_positions: JSON.stringify(insertedActivity.display_positions || []),
          activity_config: JSON.stringify(insertedActivity.activity_config || {}),
          rule_config: JSON.stringify(insertedActivity.rule_config || {}),
          product_count: replacedItems?.items?.length || 0,
          activity_stock_total: replacedItems?.items?.reduce((sum, item) => sum + Number(item.activity_stock || 0), 0) || 0,
          sold_count_total: replacedItems?.items?.reduce((sum, item) => sum + Number(item.sold_count || 0), 0) || 0,
        };
      }
      return null;
    },
    async selectActivityItems(id) {
      if (id === 'source-activity') return sourceItems;
      if (insertedActivity && insertedActivity.id === id) return replacedItems?.items || [];
      return [];
    },
    async selectActivityScopes(id) {
      if (id === 'source-activity') return sourceScopes;
      if (insertedActivity && insertedActivity.id === id) return replacedScopes?.scopes || [];
      return [];
    },
    async insertActivity(params) {
      insertedActivity = params;
    },
    async replaceActivityItems(activityId, items) {
      replacedItems = { activityId, items };
    },
    async replaceActivityScopes(activityId, scopes) {
      replacedScopes = { activityId, scopes };
    },
  });

  const result = await service.copyActivity('source-activity', {}, 'admin-1', {});

  assert.ok(insertedActivity);
  assert.equal(insertedActivity.title, '每日秒杀 副本');
  assert.equal(insertedActivity.slug, null);
  assert.equal(insertedActivity.status, 'draft');
  assert.equal(insertedActivity.disabled, 0);
  assert.deepEqual(insertedActivity.activity_config, { tag: 'daily' });
  assert.deepEqual(insertedActivity.exclusive_with, ['coupon']);
  assert.equal(insertedActivity.usage_limit_total, 100);
  assert.equal(insertedActivity.usage_limit_per_user, 1);
  assert.equal(replacedItems.activityId, insertedActivity.id);
  assert.notEqual(replacedItems.items[0].id, 'source-item-1');
  assert.equal(replacedItems.items[0].sold_count, 0);
  assert.equal(replacedScopes.activityId, insertedActivity.id);
  assert.notEqual(replacedScopes.scopes[0].id, 'source-scope-1');
  assert.equal(replacedScopes.scopes[0].scope_id, 'product-1');
  assert.equal(result.data.id, insertedActivity.id);
  assert.equal(result.data.status, 'draft');
  assert.equal(result.data.version, 1);
  assert.equal(auditLogs[0].actionType, 'activity.copy');
  assert.equal(auditLogs[0].before.source_activity_id, 'source-activity');
  assert.equal(auditLogs[0].after.id, insertedActivity.id);
});

test('coupon activity publish requires coupon templates', async () => {
  const { service } = loadActivityServiceWithRepo();

  await assert.rejects(
    () => service.validateActivityBeforePublish({
      ...couponActivityPayload('active'),
      activity_config: { coupon_ids: [] },
      rule_config: { coupon_ids: [] },
    }),
    (err) => {
      assert.equal(err.name, 'BusinessError');
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /至少一张可领取优惠券/);
      return true;
    },
  );
});

test('coupon activity publish validates active coupon templates and stores normalized ids', async () => {
  const seenCouponChecks = [];
  const { service, getInsertedActivity } = loadActivityServiceWithRepo({
    async selectActiveCouponIdsByIds(ids) {
      seenCouponChecks.push(ids);
      return ids;
    },
  });

  const result = await service.createActivity({
    ...couponActivityPayload('active'),
    activity_config: { coupon_ids: ['coupon-1', 'coupon-1', 'coupon-2'] },
    rule_config: { coupon_ids: ['coupon-1', 'coupon-2'] },
  }, 'admin-1', {});

  assert.deepEqual(seenCouponChecks, [['coupon-1', 'coupon-2']]);
  assert.equal(getInsertedActivity().status, 'active');
  assert.equal(getInsertedActivity().type, 'coupon');
  assert.deepEqual(getInsertedActivity().activity_config.coupon_ids, ['coupon-1', 'coupon-2']);
  assert.deepEqual(result.data.activity_config.coupon_ids, ['coupon-1', 'coupon-2']);
});

test('coupon activity publish rejects inactive coupon templates', async () => {
  const { service } = loadActivityServiceWithRepo({
    async selectActiveCouponIdsByIds() {
      return ['coupon-1'];
    },
  });

  await assert.rejects(
    () => service.validateActivityBeforePublish({
      ...couponActivityPayload('active'),
      activity_config: { coupon_ids: ['coupon-1', 'coupon-2'] },
      rule_config: { coupon_ids: ['coupon-1', 'coupon-2'] },
    }),
    (err) => {
      assert.equal(err.name, 'BusinessError');
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /不存在、未发布或不可领取/);
      return true;
    },
  );
});

test('full discount activity publish normalizes rules and allows active status', async () => {
  const { service, getInsertedActivity } = loadActivityServiceWithRepo();

  const result = await service.createActivity({
    ...fullDiscountPayload('active'),
    activity_config: {
      full_discount_rules: [
        { threshold_amount: 100, discount_rate: 0.9 },
        { threshold_amount: 200, discount_percent: 85 },
      ],
    },
    rule_config: null,
  }, 'admin-1', {});

  assert.equal(getInsertedActivity().status, 'active');
  assert.equal(getInsertedActivity().type, 'full_discount');
  assert.deepEqual(getInsertedActivity().activity_config.full_discount_rules, [
    { threshold_amount: 100, discount_percent: 90 },
    { threshold_amount: 200, discount_percent: 85 },
  ]);
  assert.deepEqual(result.data.rule_config.full_discount_rules, getInsertedActivity().activity_config.full_discount_rules);
});

test('full discount activity publish rejects non-discount percentages', async () => {
  const { service } = loadActivityServiceWithRepo();

  await assert.rejects(
    () => service.validateActivityBeforePublish({
      ...fullDiscountPayload('active'),
      activity_config: { full_discount_rules: [{ threshold_amount: 100, discount_percent: 100 }] },
      rule_config: { full_discount_rules: [{ threshold_amount: 100, discount_percent: 100 }] },
    }),
    (err) => {
      assert.equal(err.name, 'BusinessError');
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /满折折扣/);
      return true;
    },
  );
});

test('member price activity publish normalizes rules and allows active status', async () => {
  const { service, getInsertedActivity } = loadActivityServiceWithRepo();

  const result = await service.createActivity({
    ...memberPricePayload('active'),
    activity_config: {
      member_price_rules: [
        { discount_rate: 0.95, min_order_amount: 0, member_level_ids: ['vip'] },
        { discount_percent: 90, min_order_amount: 200, memberLevelIds: ['svip'] },
      ],
    },
    rule_config: null,
  }, 'admin-1', {});

  assert.equal(getInsertedActivity().status, 'active');
  assert.equal(getInsertedActivity().type, 'member_price');
  assert.deepEqual(getInsertedActivity().activity_config.member_price_rules, [
    { discount_percent: 95, min_order_amount: 0, member_level_ids: ['vip'] },
    { discount_percent: 90, min_order_amount: 200, member_level_ids: ['svip'] },
  ]);
  assert.deepEqual(result.data.rule_config.member_price_rules, getInsertedActivity().activity_config.member_price_rules);
});

test('legacy member activity payload is adapted to member price model', async () => {
  const { service, getInsertedActivity } = loadActivityServiceWithRepo();

  const result = await service.createActivity({
    ...memberPricePayload('active'),
    type: 'member_activity',
    activity_config: { discount_rate: 0.9, min_order_amount: 20 },
    rule_config: null,
  }, 'admin-1', {});

  assert.equal(getInsertedActivity().type, 'member_price');
  assert.equal(result.data.type, 'member_price');
  assert.deepEqual(getInsertedActivity().activity_config.member_price_rules, [{
    discount_percent: 90,
    min_order_amount: 20,
    member_level_ids: [],
  }]);
});

test('member price activity publish rejects non-discount percentages', async () => {
  const { service } = loadActivityServiceWithRepo();

  await assert.rejects(
    () => service.validateActivityBeforePublish({
      ...memberPricePayload('active'),
      activity_config: { member_price_rules: [{ discount_percent: 100, min_order_amount: 0 }] },
      rule_config: { member_price_rules: [{ discount_percent: 100, min_order_amount: 0 }] },
    }),
    (err) => {
      assert.equal(err.name, 'BusinessError');
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /会员价折扣/);
      return true;
    },
  );
});

test('legacy points bonus payload is adapted to points reward model', async () => {
  const { service, getInsertedActivity } = loadActivityServiceWithRepo();

  await service.createActivity({
    type: 'points_bonus',
    title: '旧积分活动',
    start_at: '2026-06-08 10:00:00',
    end_at: '2026-06-09 10:00:00',
    status: 'active',
    scope_type: 'product',
    scope_ids: ['product-1'],
    display_positions: ['checkout_notice'],
    activity_config: { multiplier_percent: 200, min_order_amount: 0, max_bonus_points: 0 },
    rule_config: null,
    items: [],
  }, 'admin-1', {});

  assert.equal(getInsertedActivity().type, 'points_reward');
});

test('checkin reward activity publish normalizes daily points config', async () => {
  const { service, getInsertedActivity } = loadActivityServiceWithRepo();

  const result = await service.createActivity({
    ...checkinRewardPayload('active'),
    activity_config: {
      points: 8,
      streak_bonus_points: 2,
      streak_bonus_every_days: 7,
    },
    rule_config: null,
  }, 'admin-1', {});

  assert.equal(getInsertedActivity().status, 'active');
  assert.equal(getInsertedActivity().type, 'checkin_reward');
  assert.deepEqual(getInsertedActivity().activity_config, {
    points: 8,
    streak_bonus_points: 2,
    streak_bonus_every_days: 7,
    bonus_kind: 'checkin',
    reward_points: 8,
    once_per_day: true,
  });
  assert.deepEqual(result.data.rule_config, getInsertedActivity().activity_config);
});

test('checkin reward activity publish rejects invalid reward points', async () => {
  const { service } = loadActivityServiceWithRepo();

  await assert.rejects(
    () => service.validateActivityBeforePublish({
      ...checkinRewardPayload('active'),
      activity_config: { reward_points: 0 },
      rule_config: { reward_points: 0 },
    }),
    (err) => {
      assert.equal(err.name, 'BusinessError');
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /签到奖励积分/);
      return true;
    },
  );
});

test('publishing an edited flash sale normalizes ISO datetimes before update', async () => {
  let updateArgs = null;
  const existing = {
    id: 'activity-1',
    type: 'flash_sale',
    title: '秒杀测试',
    subtitle: '',
    cover_image: '',
    description: '',
    start_at: '2026-06-12 07:21:00',
    end_at: '2026-06-30 07:21:00',
    status: 'draft',
    disabled: 0,
    display_positions: JSON.stringify(['home_flash_sale']),
    scope_type: 'product',
    allow_coupon_stack: 1,
    allow_points_stack: 1,
    allow_reward: 1,
    publish_at: null,
    internal_note: '',
    activity_config: null,
    threshold_amount: null,
    discount_amount: null,
    sort_order: 0,
    product_count: 1,
    activity_stock_total: 10,
    sold_count_total: 0,
  };
  const item = {
    id: 'item-1',
    activity_id: 'activity-1',
    product_id: 'product-1',
    activity_price: 50,
    activity_stock: 2,
    sold_count: 0,
    limit_per_user: 1,
    sort_order: 0,
    product_name: '测试商品',
    product_price: 100,
    product_stock: 10,
  };

  const { service } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      return id === existing.id ? { ...existing } : null;
    },
    async selectActivityItems() {
      return [item];
    },
    async selectActivityScopes() {
      return [{ id: 'scope-1', activity_id: 'activity-1', scope_type: 'product', scope_id: 'product-1' }];
    },
    async selectProductStocksByIds() {
      return [{
        id: 'product-1',
        name: '测试商品',
        stock: 10,
        price: 100,
        lifecycle_status: 1,
      }];
    },
    async updateActivityDynamic(id, fragments, values) {
      updateArgs = { id, fragments, values };
    },
    async replaceActivityItems() {},
    async replaceActivityScopes() {},
  });

  await service.updateActivity('activity-1', {
    ...flashSalePayload('active'),
    start_at: '2026-06-12T07:21:00.000Z',
    end_at: '2026-06-30T07:21:00.000Z',
  }, 'admin-1', {});

  assert.ok(updateArgs);
  const startIdx = updateArgs.fragments.indexOf('start_at = ?');
  const endIdx = updateArgs.fragments.indexOf('end_at = ?');
  assert.equal(updateArgs.values[startIdx], '2026-06-12 07:21:00');
  assert.equal(updateArgs.values[endIdx], '2026-06-30 07:21:00');
  assert.equal(updateArgs.values[startIdx].includes('T'), false);
  assert.equal(updateArgs.values[startIdx].includes('Z'), false);
});

test('editing a flash sale keeps existing sold counts when the form omits them', async () => {
  const existing = {
    id: 'activity-1',
    type: 'flash_sale',
    title: '秒杀测试',
    start_at: '2026-06-12 07:21:00',
    end_at: '2026-06-30 07:21:00',
    status: 'draft',
    disabled: 0,
    display_positions: JSON.stringify(['home_flash_sale']),
    scope_type: 'product',
    allow_coupon_stack: 1,
    allow_points_stack: 1,
    allow_reward: 1,
    publish_at: null,
    internal_note: '',
    activity_config: null,
    threshold_amount: null,
    discount_amount: null,
    sort_order: 0,
    product_count: 1,
    activity_stock_total: 10,
    sold_count_total: 6,
  };
  const item = {
    id: 'item-1',
    activity_id: 'activity-1',
    product_id: 'product-1',
    activity_price: 50,
    activity_stock: 10,
    sold_count: 6,
    limit_per_user: 1,
    sort_order: 0,
    product_name: '测试商品',
    product_price: 100,
    product_stock: 10,
  };
  let replacedItems = null;

  const { service } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      return id === existing.id ? { ...existing } : null;
    },
    async selectActivityItems() {
      return [item];
    },
    async selectActivityScopes() {
      return [{ id: 'scope-1', activity_id: 'activity-1', scope_type: 'product', scope_id: 'product-1' }];
    },
    async updateActivityDynamic() {
      return 1;
    },
    async replaceActivityItems(activityId, items) {
      replacedItems = { activityId, items };
    },
    async replaceActivityScopes() {},
  });

  await service.updateActivity('activity-1', {
    ...flashSalePayload('draft'),
    items: [{
      product_id: 'product-1',
      activity_price: 45,
      activity_stock: 12,
      limit_per_user: 2,
    }],
  }, 'admin-1', {});

  assert.ok(replacedItems);
  assert.equal(replacedItems.activityId, 'activity-1');
  assert.equal(replacedItems.items[0].sold_count, 6);
  assert.equal(replacedItems.items[0].activity_price, 45);
  assert.equal(replacedItems.items[0].activity_stock, 12);
});

test('editing an activity rejects stale version to avoid overwriting another admin changes', async () => {
  const existing = {
    id: 'activity-1',
    type: 'flash_sale',
    title: '秒杀测试',
    start_at: '2026-06-12 07:21:00',
    end_at: '2026-06-30 07:21:00',
    status: 'draft',
    disabled: 0,
    display_positions: JSON.stringify(['home_flash_sale']),
    activity_config: null,
    rule_config: null,
    product_count: 1,
    activity_stock_total: 10,
    sold_count_total: 0,
    version: 4,
  };
  const item = {
    id: 'item-1',
    activity_id: 'activity-1',
    product_id: 'product-1',
    activity_price: 50,
    activity_stock: 2,
    sold_count: 0,
    limit_per_user: 1,
    sort_order: 0,
    product_name: '测试商品',
    product_price: 100,
    product_stock: 10,
  };
  let updateArgs = null;
  let itemsReplaced = false;

  const { service } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      return id === existing.id ? { ...existing } : null;
    },
    async selectActivityItems() {
      return [item];
    },
    async selectActivityScopes() {
      return [{ id: 'scope-1', activity_id: 'activity-1', scope_type: 'product', scope_id: 'product-1' }];
    },
    async updateActivityDynamic(id, fragments, values, adminUserId, expectedVersion) {
      updateArgs = { id, fragments, values, adminUserId, expectedVersion };
      return 0;
    },
    async replaceActivityItems() {
      itemsReplaced = true;
    },
    async replaceActivityScopes() {},
  });

  await assert.rejects(
    () => service.updateActivity('activity-1', {
      ...flashSalePayload('draft'),
      version: 3,
    }, 'admin-1', {}),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.message, '数据已被其他管理员修改，请刷新后再编辑');
      return true;
    },
  );

  assert.ok(updateArgs);
  assert.equal(updateArgs.expectedVersion, 3);
  assert.equal(updateArgs.fragments.includes('version = COALESCE(version, 1) + 1'), true);
  assert.equal(itemsReplaced, false);
});

test('activity status actions pause and audit runtime status transition', async () => {
  const existing = {
    id: 'activity-1',
    type: 'flash_sale',
    title: '秒杀测试',
    start_at: '2026-06-12 07:21:00',
    end_at: '2026-06-30 07:21:00',
    status: 'active',
    disabled: 0,
    display_positions: JSON.stringify(['home_flash_sale']),
    activity_config: null,
    product_count: 0,
    activity_stock_total: 0,
    sold_count_total: 0,
  };
  let runtimeUpdate = null;

  const { service, auditLogs } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      return id === existing.id ? { ...existing } : null;
    },
    async setActivityRuntimeStatus(id, transition, adminUserId, expectedVersion) {
      runtimeUpdate = { id, transition, adminUserId, expectedVersion };
      existing.status = transition.status;
      existing.disabled = transition.disabled ? 1 : 0;
      return 1;
    },
  });

  const result = await service.updateActivityStatus('activity-1', { action: 'pause', version: 2 }, 'admin-1', {});

  assert.deepEqual(runtimeUpdate, {
    id: 'activity-1',
    transition: {
      action: 'pause',
      status: 'paused',
      disabled: 0,
      auditAction: 'activity.pause',
      summaryVerb: '暂停',
    },
    adminUserId: 'admin-1',
    expectedVersion: 2,
  });
  assert.equal(result.data.status, 'paused');
  assert.equal(auditLogs[0].actionType, 'activity.pause');
  assert.equal(auditLogs[0].before.status, 'active');
  assert.equal(auditLogs[0].after.status, 'paused');
});

test('activity status action rejects stale version before writing audit log', async () => {
  const existing = {
    id: 'activity-1',
    type: 'flash_sale',
    title: '秒杀测试',
    start_at: '2026-06-12 07:21:00',
    end_at: '2026-06-30 07:21:00',
    status: 'active',
    disabled: 0,
    display_positions: JSON.stringify(['home_flash_sale']),
    activity_config: null,
    product_count: 0,
    activity_stock_total: 0,
    sold_count_total: 0,
    version: 5,
  };
  let runtimeUpdate = null;

  const { service, auditLogs } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      return id === existing.id ? { ...existing } : null;
    },
    async setActivityRuntimeStatus(id, transition, adminUserId, expectedVersion) {
      runtimeUpdate = { id, transition, adminUserId, expectedVersion };
      return 0;
    },
  });

  await assert.rejects(
    () => service.updateActivityStatus('activity-1', { action: 'pause', version: 4 }, 'admin-1', {}),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.message, '数据已被其他管理员修改，请刷新后再操作');
      return true;
    },
  );

  assert.ok(runtimeUpdate);
  assert.equal(runtimeUpdate.expectedVersion, 4);
  assert.equal(auditLogs.length, 0);
});

test('activity detail exposes effect stats and usage risk', async () => {
  const existing = {
    id: 'activity-1',
    type: 'flash_sale',
    title: '秒杀测试',
    start_at: '2026-06-12 07:21:00',
    end_at: '2026-06-30 07:21:00',
    status: 'active',
    disabled: 0,
    display_positions: JSON.stringify(['home_flash_sale']),
    activity_config: null,
    product_count: 1,
    activity_stock_total: 20,
    sold_count_total: 9,
    usage_limit_total: 10,
    usage_limit_per_user: 1,
    stackable: 0,
    exclusive_with: JSON.stringify(['coupon']),
    version: 2,
    active_order_count: 6,
    confirmed_order_count: 5,
    locked_order_count: 1,
    active_usage_count: 8,
    total_usage_count: 11,
    active_discount_amount: 32.5,
    confirmed_discount_amount: 30,
  };

  const { service } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      return id === existing.id ? { ...existing } : null;
    },
  });

  const result = await service.getActivity('activity-1');

  assert.equal(result.data.version, 2);
  assert.equal(result.data.usage_limit_total, 10);
  assert.deepEqual(result.data.exclusive_with, ['coupon']);
  assert.equal(result.data.effect_stats.active_order_count, 6);
  assert.equal(result.data.effect_stats.active_discount_amount, 32.5);
  assert.equal(result.data.effect_stats.limit_usage_rate, 80);
  assert.equal(result.data.effect_stats.risk_level, 'limit_warning');
});

test('legacy disabled payload still disables activity status endpoint', async () => {
  const existing = {
    id: 'activity-1',
    type: 'flash_sale',
    title: '秒杀测试',
    start_at: '2026-06-12 07:21:00',
    end_at: '2026-06-30 07:21:00',
    status: 'active',
    disabled: 0,
    display_positions: JSON.stringify(['home_flash_sale']),
    activity_config: null,
    product_count: 0,
    activity_stock_total: 0,
    sold_count_total: 0,
  };
  let runtimeUpdate = null;

  const { service } = loadActivityServiceWithRepo({
    async selectActivityById(id) {
      return id === existing.id ? existing : null;
    },
    async setActivityRuntimeStatus(id, transition) {
      runtimeUpdate = { id, transition };
      existing.status = transition.status;
      existing.disabled = transition.disabled ? 1 : 0;
      return 1;
    },
  });

  const result = await service.updateActivityStatus('activity-1', { disabled: true }, 'admin-1', {});

  assert.equal(runtimeUpdate.transition.status, 'disabled');
  assert.equal(runtimeUpdate.transition.disabled, 1);
  assert.equal(result.data.status, 'disabled');
  assert.equal(result.data.disabled, true);
});
