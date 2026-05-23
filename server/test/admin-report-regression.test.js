const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  PAID_PAYMENT_STATUSES,
  EXCLUDED_ORDER_STATUSES,
  METRIC_DEFINITIONS,
} = require('../src/modules/admin/report/reportMetricDefinitions');
const { fixture, summarizeFixture, isPaid, isEffective } = require('./fixtures/reportingOrders.fixture');

describe('admin report regression metric contract', () => {
  test('paid and effective order predicates exclude unpaid and cancelled orders', () => {
    assert.deepEqual(PAID_PAYMENT_STATUSES, ['paid', 'partially_refunded']);
    assert.deepEqual(EXCLUDED_ORDER_STATUSES, ['cancelled']);
    assert.equal(isPaid(fixture.orders.find((order) => order.id === 'unpaid-300')), false);
    assert.equal(isEffective(fixture.orders.find((order) => order.id === 'cancelled-500')), false);
  });

  test('sales and profit fixture documents the protected reporting totals', () => {
    const summary = summarizeFixture();

    assert.equal(summary.paid_order_count, 6);
    assert.equal(summary.gross_sales, 630);
    assert.equal(summary.net_sales, 580);
    assert.equal(summary.refund_amount, 50);
    assert.equal(summary.discount_amount, 20);
    assert.equal(summary.goods_cost_amount, 317);
    assert.equal(summary.gross_profit_amount, 313);
    assert.equal(summary.expense_amount, 30);
    assert.equal(summary.net_profit_amount, 234);
    assert.equal(summary.missing_cost_order_count, 1);
    assert.equal(summary.sales_qty, 7);
  });

  test('metric definitions state all report-sensitive financial口径', () => {
    for (const key of [
      'grossSales',
      'netSales',
      'refundAmount',
      'discountAmount',
      'goodsCost',
      'grossProfit',
      'netProfit',
      'paidOrder',
      'effectiveOrder',
      'cancelledOrder',
    ]) {
      assert.equal(typeof METRIC_DEFINITIONS[key], 'string');
      assert.ok(METRIC_DEFINITIONS[key].length > 0);
    }
  });
});
