const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadDashboardServiceWithRepo(repoOverrides = {}) {
  const servicePath = require.resolve('../src/modules/admin/service/adminDashboard.service');
  const repoPath = require.resolve('../src/modules/admin/repository/adminDashboard.repository');
  delete require.cache[servicePath];
  delete require.cache[repoPath];

  const calls = [];
  const repo = {
    async countOrdersExcludingCancelled() { return 0; },
    async countUsers() { return 0; },
    async countProducts() { return 0; },
    async sumCompletedRevenue() { return 0; },
    async selectTodaySummary(dateFrom, dateTo) {
      calls.push(['selectTodaySummary', dateFrom, dateTo]);
      return {
        todayRevenue: 123.45,
        todayPaidOrders: 3,
        todayOrders: 5,
        todayNewUsers: 2,
        pendingPayment: 1,
        pendingShip: 4,
        pendingAfterSale: 0,
        lowStock: 6,
        outOfStock: 1,
      };
    },
    async selectTodos() {
      return { pendingShip: 4, afterSale: 0, paymentFailed: 0, lowStock: 6, outOfStock: 1 };
    },
    async selectSalesTrend() { return []; },
    async selectCategorySalesShare() { return []; },
    async selectTopProducts() { return []; },
    async selectLowStockProducts() { return []; },
    async selectAnalyticsMonitor() { return {}; },
    async selectRecentOrders() { return []; },
    ...repoOverrides,
  };

  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  return { service: require(servicePath), calls };
}

test('dashboard summary metrics use the selected date range', async () => {
  const { service, calls } = loadDashboardServiceWithRepo();

  const result = await service.getStats({
    range_preset: 'custom',
    date_from: '2024-02-01',
    date_to: '2024-02-03',
  }, { isSuperAdmin: true });

  assert.deepEqual(calls[0], ['selectTodaySummary', '2024-02-01', '2024-02-03']);
  assert.equal(result.range.dateFrom, '2024-02-01');
  assert.equal(result.range.dateTo, '2024-02-03');
  assert.equal(result.today.revenue, 123.45);
  assert.equal(result.today.paidOrders, 3);
  assert.equal(result.today.orderCount, 5);
  assert.equal(result.today.newUsers, 2);
});

test('dashboard stats cache reuses reads and separates order permissions', async (t) => {
  const previousTtl = process.env.ADMIN_DASHBOARD_STATS_CACHE_TTL_MS;
  process.env.ADMIN_DASHBOARD_STATS_CACHE_TTL_MS = '60000';
  t.after(() => {
    if (previousTtl == null) {
      delete process.env.ADMIN_DASHBOARD_STATS_CACHE_TTL_MS;
    } else {
      process.env.ADMIN_DASHBOARD_STATS_CACHE_TTL_MS = previousTtl;
    }
  });

  let countOrdersCalls = 0;
  const { service } = loadDashboardServiceWithRepo({
    async countOrdersExcludingCancelled() {
      countOrdersCalls += 1;
      return countOrdersCalls;
    },
  });

  const first = await service.getStats({ range_preset: 'last_7_days' }, { isSuperAdmin: true });
  const second = await service.getStats({ range_preset: 'last_7_days' }, { isSuperAdmin: true });
  const noOrderPermission = await service.getStats({ range_preset: 'last_7_days' }, { permissions: [] });

  assert.equal(first.totalOrders, 1);
  assert.equal(second.totalOrders, 1);
  assert.equal(noOrderPermission.totalOrders, 2);
  assert.equal(noOrderPermission.canViewOrders, false);
  assert.equal(countOrdersCalls, 2);

  service.invalidateDashboardStatsCache();
  const afterInvalidation = await service.getStats({ range_preset: 'last_7_days' }, { isSuperAdmin: true });

  assert.equal(afterInvalidation.totalOrders, 3);
});

test('dashboard recent orders query pages ids before reading row details', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/modules/admin/repository/adminDashboard.repository.js'),
    'utf8',
  );
  const start = source.indexOf('async function selectRecentOrders');
  const end = source.indexOf('\nasync function selectAnalyticsMonitor', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const querySource = source.slice(start, end);

  assert.match(querySource, /FROM \(\s*SELECT id, created_at\s*FROM orders\s*ORDER BY created_at DESC\s*LIMIT \?\s*\) recent/i);
  assert.match(querySource, /INNER JOIN orders o ON o\.id = recent\.id/i);
});
