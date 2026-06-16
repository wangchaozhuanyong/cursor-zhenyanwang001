const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const paymentsService = require('../src/modules/payment/service/payments.service');
const payRepo = require('../src/modules/payment/repository/payments.repository');
const siteCapabilities = require('../src/modules/siteCapabilities');

process.env.AUDIT_LOG_DISABLED = '1';

function fakeConnection() {
  return {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
}

describe('payment reconciliation review service', () => {
  test('creates reconciliation with provider report amount and calculated difference', async () => {
    const original = {
      aggregatePaidByDayAndChannel: payRepo.aggregatePaidByDayAndChannel,
      insertReconciliation: payRepo.insertReconciliation,
    };
    let inserted = null;
    try {
      payRepo.aggregatePaidByDayAndChannel = async (_q, date, provider, channelCode) => {
        assert.equal(date, '2026-06-15');
        assert.equal(provider, 'billplz');
        assert.equal(channelCode, 'billplz_fpx');
        return {
          order_count: 2,
          success_amount: '200.00',
          provider_fee_amount: '3.50',
        };
      };
      payRepo.insertReconciliation = async (_q, row) => {
        inserted = row;
      };

      const result = await paymentsService.createReconciliation(
        { user: { id: 'admin-1' }, method: 'POST', headers: {} },
        {
          reconcile_date: '2026-06-15',
          provider: 'billplz',
          channel_code: 'billplz_fpx',
          provider_report_amount: 196,
          provider_reference: 'stmt-001',
          difference_reason: '渠道手续费跨日',
        },
      );

      assert.ok(result.data.id);
      assert.equal(inserted.order_count, 2);
      assert.equal(inserted.success_amount, 200);
      assert.equal(inserted.provider_fee_amount, 3.5);
      assert.equal(inserted.expected_settlement_amount, 196.5);
      assert.equal(inserted.provider_report_amount, 196);
      assert.equal(inserted.diff_amount, -0.5);
      assert.equal(inserted.status, 'needs_review');
      assert.equal(inserted.review_status, 'needs_review');
      assert.equal(inserted.provider_reference, 'stmt-001');
    } finally {
      payRepo.aggregatePaidByDayAndChannel = original.aggregatePaidByDayAndChannel;
      payRepo.insertReconciliation = original.insertReconciliation;
    }
  });

  test('reviews payment event with audit-safe status update', async () => {
    const original = {
      getConnection: payRepo.getConnection,
      selectPaymentEventByIdForUpdate: payRepo.selectPaymentEventByIdForUpdate,
      updatePaymentEventReview: payRepo.updatePaymentEventReview,
    };
    let updated = null;
    try {
      const conn = fakeConnection();
      payRepo.getConnection = async () => conn;
      payRepo.selectPaymentEventByIdForUpdate = async (_conn, eventId) => ({
        id: eventId,
        review_status: 'needs_review',
        review_note: '',
      });
      payRepo.updatePaymentEventReview = async (_conn, eventId, row) => {
        updated = { eventId, row };
        return 1;
      };

      const result = await paymentsService.reviewPaymentEvent(
        { user: { id: 'admin-1' }, method: 'PATCH', headers: {} },
        'evt-1',
        { review_status: 'confirmed', review_note: '已核对 Billplz 后台账单' },
      );

      assert.equal(result.data.id, 'evt-1');
      assert.equal(result.data.review_status, 'confirmed');
      assert.equal(updated.eventId, 'evt-1');
      assert.equal(updated.row.review_status, 'confirmed');
      assert.equal(updated.row.review_note, '已核对 Billplz 后台账单');
      assert.equal(updated.row.reviewed_by, 'admin-1');
    } finally {
      payRepo.getConnection = original.getConnection;
      payRepo.selectPaymentEventByIdForUpdate = original.selectPaymentEventByIdForUpdate;
      payRepo.updatePaymentEventReview = original.updatePaymentEventReview;
    }
  });

  test('hides Billplz and FPX channels while billplzEnabled is disabled', async () => {
    const original = {
      selectChannelsByCountryCurrency: payRepo.selectChannelsByCountryCurrency,
      isCapabilityEnabled: siteCapabilities.api.isCapabilityEnabled,
      stripeSecret: process.env.STRIPE_SECRET_KEY,
    };
    const rows = [
      { id: 'stripe', code: 'stripe_checkout', provider: 'stripe', name: 'Stripe', country_code: 'MY', currency: 'MYR', sort_order: 10, environment: 'live' },
      { id: 'billplz', code: 'billplz_fpx', provider: 'billplz', name: 'Billplz / FPX', country_code: 'MY', currency: 'MYR', sort_order: 8, environment: 'sandbox' },
      { id: 'fpx', code: 'direct_fpx', provider: 'fpx', name: 'FPX Direct', country_code: 'MY', currency: 'MYR', sort_order: 9, environment: 'sandbox' },
      { id: 'manual', code: 'manual_bank', provider: 'manual', name: 'Manual', country_code: 'MY', currency: 'MYR', sort_order: 20, environment: 'live' },
    ];
    try {
      delete process.env.STRIPE_SECRET_KEY;
      payRepo.selectChannelsByCountryCurrency = async () => rows;
      siteCapabilities.api.isCapabilityEnabled = async () => false;
      const hidden = await paymentsService.listChannelsForUser('MY', 'MYR');
      assert.deepEqual(hidden.map((row) => row.code), ['manual_bank']);

      siteCapabilities.api.isCapabilityEnabled = async () => true;
      const visible = await paymentsService.listChannelsForUser('MY', 'MYR');
      assert.deepEqual(visible.map((row) => row.code), ['billplz_fpx', 'direct_fpx', 'manual_bank']);
    } finally {
      payRepo.selectChannelsByCountryCurrency = original.selectChannelsByCountryCurrency;
      siteCapabilities.api.isCapabilityEnabled = original.isCapabilityEnabled;
      process.env.STRIPE_SECRET_KEY = original.stripeSecret;
    }
  });
});
