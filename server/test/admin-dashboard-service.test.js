const { test } = require('node:test');
const assert = require('node:assert/strict');

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
