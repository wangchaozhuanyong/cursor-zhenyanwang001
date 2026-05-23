const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { REPORT_REGISTRY } = require('../src/modules/admin/report/adminReportRegistry');

const reportByType = new Map(REPORT_REGISTRY.map((report) => [report.type, report]));

describe('admin report API contract registry', () => {
  test('all report endpoints used by frontend are registered', () => {
    for (const [type, endpoint] of [
      ['sales_daily', '/admin/reports/sales/daily'],
      ['sales_monthly', '/admin/reports/sales/monthly'],
      ['profit_daily', '/admin/reports/profit/daily'],
      ['profit_monthly', '/admin/reports/profit/monthly'],
      ['product_analysis', '/admin/reports/products/analysis'],
      ['category_analysis', '/admin/reports/categories/analysis'],
      ['order_analysis', '/admin/reports/orders/analysis'],
      ['customer_analysis', '/admin/reports/customers/analysis'],
      ['activity_analysis', '/admin/reports/activities/analysis'],
      ['coupon_analysis', '/admin/reports/coupons/analysis'],
      ['inventory_analysis', '/admin/reports/inventory/analysis'],
      ['search_analysis', '/admin/reports/search/analysis'],
      ['traffic_analysis', '/admin/reports/traffic'],
    ]) {
      assert.equal(reportByType.get(type)?.endpoint, endpoint);
    }
  });

  test('profit reports expose required financial fields', () => {
    for (const type of ['profit_daily', 'profit_monthly']) {
      const columns = reportByType.get(type)?.csvColumns || [];
      for (const field of [
        'net_profit_amount',
        'net_margin',
        'goods_cost_amount',
        'gross_profit_amount',
        'expense_amount',
        'missing_cost_order_count',
      ]) {
        assert.ok(columns.includes(field), `${type} missing ${field}`);
      }
    }
  });

  test('sales daily exposes daily profit fields for operations review', () => {
    const columns = reportByType.get('sales_daily')?.csvColumns || [];
    for (const field of [
      'goods_cost_amount',
      'gross_profit_amount',
      'gross_margin',
      'expense_amount',
      'net_profit_amount',
      'net_margin',
      'missing_cost_order_count',
    ]) {
      assert.ok(columns.includes(field), `sales_daily missing ${field}`);
    }
  });

  test('daily and monthly reports keep date bucket columns', () => {
    assert.ok(reportByType.get('sales_daily').csvColumns.includes('date'));
    assert.ok(reportByType.get('profit_daily').csvColumns.includes('date'));
    assert.ok(reportByType.get('sales_monthly').csvColumns.includes('month'));
    assert.ok(reportByType.get('profit_monthly').csvColumns.includes('month'));
  });

  test('capability-gated reports declare capability in backend registry', () => {
    assert.equal(reportByType.get('inventory_analysis').capability, 'inventoryEnabled');
    assert.equal(reportByType.get('coupon_analysis').capability, 'couponEnabled');
    assert.equal(reportByType.get('traffic_analysis').capability, 'trafficAnalyticsEnabled');
  });
});
