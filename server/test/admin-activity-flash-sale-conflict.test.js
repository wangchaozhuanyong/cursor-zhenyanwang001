const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');

const servicePath = require.resolve('../src/modules/admin/service/adminActivity.service');
const repoPath = require.resolve('../src/modules/admin/repository/adminActivity.repository');
const auditLogPath = require.resolve('../src/utils/auditLog');
const helpersPath = require.resolve('../src/utils/helpers');
const productModulePath = require.resolve('../src/modules/product');

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

  const defaultRepo = {
    async selectProductStocksByIds() {
      return [];
    },
    async selectConflictingActivities() {
      calls.selectConflictingActivities += 1;
      return [];
    },
    async insertActivity(params) {
      insertedActivity = params;
    },
    async replaceActivityItems() {},
    async replaceActivityScopes() {},
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
      async writeAuditLog() {},
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
      api: {
        clearCatalogCache() {},
      },
    },
  };

  return {
    service: require(servicePath),
    calls,
    getInsertedActivity: () => insertedActivity,
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
      return id === existing.id ? existing : null;
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
