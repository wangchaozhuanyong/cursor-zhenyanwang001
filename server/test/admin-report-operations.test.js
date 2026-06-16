const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const reportService = require('../src/modules/admin/service/adminReport.service');
const reportRepo = require('../src/modules/admin/repository/adminReport.repository');

const original = {
  selectDiscountCostReport: reportRepo.selectDiscountCostReport,
  selectInventoryOccupancyReport: reportRepo.selectInventoryOccupancyReport,
  selectPaymentFailureReport: reportRepo.selectPaymentFailureReport,
};

afterEach(() => {
  reportRepo.selectDiscountCostReport = original.selectDiscountCostReport;
  reportRepo.selectInventoryOccupancyReport = original.selectInventoryOccupancyReport;
  reportRepo.selectPaymentFailureReport = original.selectPaymentFailureReport;
});

describe('admin phase 7 operations reports', () => {
  test('discount cost report summarizes discount sources and cost rate', async () => {
    reportRepo.selectDiscountCostReport = async () => [
      {
        date: '2026-06-15',
        order_count: 3,
        paid_order_count: 2,
        paid_amount: '200.00',
        activity_discount_amount: '10.00',
        coupon_discount_amount: '5.00',
        points_discount_amount: '2.00',
        reward_cash_discount_amount: '3.00',
        shipping_discount_amount: '4.00',
        total_discount_amount: '24.00',
      },
    ];

    const report = await reportService.getDiscountCostReport({
      date_from: '2026-06-15',
      date_to: '2026-06-15',
    });

    assert.equal(report.summary.支付订单数, 2);
    assert.equal(report.summary.实收金额, 200);
    assert.equal(report.summary.优惠成本, 24);
    assert.equal(report.summary.优惠成本率, 12);
    assert.equal(report.list[0].discount_rate, 12);
  });

  test('inventory occupancy report separates reserved and unpaid-order occupancy', async () => {
    reportRepo.selectInventoryOccupancyReport = async () => [
      {
        product_name: 'Test Product',
        variant_name: 'Box',
        sku_code: 'SKU-1',
        stock: 10,
        reserved_stock: 3,
        pending_order_locked_stock: 2,
        pending_order_count: 1,
        locked_stock: 5,
        available_stock: 7,
        warning_stock: 8,
      },
    ];

    const report = await reportService.getInventoryOccupancyReport();

    assert.equal(report.summary.SKU数, 1);
    assert.equal(report.summary.锁定库存, 5);
    assert.equal(report.summary.预留库存, 3);
    assert.equal(report.summary.待支付占用, 2);
    assert.equal(report.summary.低库存SKU, 1);
    assert.equal(report.list[0].stock_status, 'low_stock');
  });

  test('payment failure report is exportable through unified report export', async () => {
    reportRepo.selectPaymentFailureReport = async () => [
      {
        provider: 'billplz',
        channel_code: 'billplz_fpx',
        failure_reason: 'amount_mismatch',
        event_type: 'billplz.paid',
        verify_status: 'failed',
        processing_result: 'rejected',
        risk_level: 'P0',
        review_status: 'needs_review',
        failed_event_count: 1,
        payment_order_count: 1,
        affected_order_count: 1,
        expected_amount: 100,
        actual_amount: 99,
        latest_event_at: '2026-06-15 12:00:00',
      },
    ];

    const exported = await reportService.exportByType('payment_failure', {
      date_from: '2026-06-15',
      date_to: '2026-06-15',
    });

    assert.equal(exported.filename, 'payment-failure-2026-06-15-2026-06-15.csv');
    assert.match(exported.csv, /支付网关/);
    assert.match(exported.csv, /amount_mismatch/);
  });
});
