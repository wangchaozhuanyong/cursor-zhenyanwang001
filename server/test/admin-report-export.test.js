const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { REPORT_REGISTRY, listExportableReports } = require('../src/modules/admin/report/adminReportRegistry');

describe('admin report export contract', () => {
  test('all exportable reports have handlers, filenames and csv columns', () => {
    for (const report of listExportableReports()) {
      assert.equal(typeof report.serviceHandler, 'string', `${report.type} missing serviceHandler`);
      assert.equal(typeof report.filenamePrefix, 'string', `${report.type} missing filenamePrefix`);
      assert.ok(Array.isArray(report.csvColumns), `${report.type} missing csvColumns`);
      if (report.type !== 'traffic_analysis') {
        assert.ok(report.csvColumns.length > 0, `${report.type} csvColumns must not be empty`);
      }
    }
  });

  test('activity analysis has degraded export columns without sales metrics', () => {
    const activity = REPORT_REGISTRY.find((report) => report.type === 'activity_analysis');
    assert.deepEqual(activity.degradedCsvColumns, [
      'activity_title',
      'activity_type',
      'start_at',
      'end_at',
      'product_count',
    ]);
    for (const field of ['paid_order_count', 'sales_qty', 'sales_amount', 'discount_amount']) {
      assert.equal(activity.degradedCsvColumns.includes(field), false);
    }
  });

  test('customer analysis supports summary-only export fields', () => {
    const customer = REPORT_REGISTRY.find((report) => report.type === 'customer_analysis');
    for (const field of [
      'new_users',
      'order_users',
      'paying_users',
      'repeat_buyer_count',
      'repeat_purchase_rate',
      'average_order_value',
      'average_orders_per_buyer',
      'total_paid_amount',
    ]) {
      assert.ok(customer.csvColumns.includes(field), `customer_analysis missing ${field}`);
    }
  });

  test('profit daily and monthly are exportable', () => {
    const exportableTypes = new Set(listExportableReports().map((report) => report.type));
    assert.ok(exportableTypes.has('profit_daily'));
    assert.ok(exportableTypes.has('profit_monthly'));
  });
});
