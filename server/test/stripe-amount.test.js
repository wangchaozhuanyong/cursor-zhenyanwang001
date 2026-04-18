/**
 * Stripe webhook amount validation logic (unit test, no DB).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const paymentService = require('../src/modules/order/payment.service');
const { validatePaymentIntentAmount } = paymentService;
const repo = require('../src/modules/order/order.repository');

describe('validatePaymentIntentAmount', () => {
  test('passes when MYR amount matches order cents', () => {
    const result = validatePaymentIntentAmount(
      { total_amount: '10.50' },
      { amount: 1050, currency: 'myr' },
    );
    assert.equal(result.ok, true);
  });

  test('rejects when amount differs by 1 cent', () => {
    const result = validatePaymentIntentAmount(
      { total_amount: '10.50' },
      { amount: 1049, currency: 'myr' },
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'amount_mismatch');
  });

  test('rejects non-MYR currency', () => {
    const result = validatePaymentIntentAmount(
      { total_amount: '10.00' },
      { amount: 1000, currency: 'usd' },
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'currency_mismatch');
  });
});

describe('handleStripeEvent idempotency', () => {
  test('skips duplicated webhook event_id', async () => {
    const original = {
      insertWebhookEventIfAbsent: repo.insertWebhookEventIfAbsent,
      selectOrderById: repo.selectOrderById,
      updateOrderPaid: repo.updateOrderPaid,
      insertNotification: repo.insertNotification,
    };
    let updated = 0;
    try {
      repo.insertWebhookEventIfAbsent = async () => false;
      repo.selectOrderById = async () => ({
        id: 'o1',
        user_id: 'u1',
        order_no: 'NO1',
        total_amount: '12.00',
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'online',
      });
      repo.updateOrderPaid = async () => { updated += 1; };
      repo.insertNotification = async () => {};

      const result = await paymentService.handleStripeEvent({
        id: 'evt_dup_1',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_1',
            amount: 1200,
            currency: 'myr',
            created: Math.floor(Date.now() / 1000),
            metadata: { order_id: 'o1' },
          },
        },
      });

      assert.equal(result.handled, true);
      assert.equal(result.duplicate, true);
      assert.equal(updated, 0);
    } finally {
      repo.insertWebhookEventIfAbsent = original.insertWebhookEventIfAbsent;
      repo.selectOrderById = original.selectOrderById;
      repo.updateOrderPaid = original.updateOrderPaid;
      repo.insertNotification = original.insertNotification;
    }
  });
});
