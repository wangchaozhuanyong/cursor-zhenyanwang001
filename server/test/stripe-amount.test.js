/**
 * Stripe webhook amount validation logic (unit test, no DB).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const paymentService = require('../src/modules/payment/service/payment.service');
const { validatePaymentIntentAmount } = paymentService;
const orderApi = require('../src/modules/order/publicApi');

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
  test('skips all success side effects when order was already paid by another event', async () => {
    const original = {
      insertWebhookEventIfAbsent: orderApi.insertWebhookEventIfAbsent,
      selectOrderById: orderApi.selectOrderById,
      updateOrderPaid: orderApi.updateOrderPaid,
      markCheckoutAbandonmentPaidByOrderId: orderApi.markCheckoutAbandonmentPaidByOrderId,
      getOrderConnection: orderApi.getOrderConnection,
      selectOrderItemQtyRows: orderApi.selectOrderItemQtyRows,
      incrementProductSales: orderApi.incrementProductSales,
      insertOrderNotification: orderApi.insertOrderNotification,
    };
    let updateAttempted = 0;
    try {
      orderApi.insertWebhookEventIfAbsent = async () => true;
      orderApi.selectOrderById = async () => ({
        id: 'o1',
        user_id: 'u1',
        order_no: 'NO1',
        total_amount: '12.00',
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'online',
      });
      orderApi.updateOrderPaid = async () => {
        updateAttempted += 1;
        return 0;
      };
      orderApi.markCheckoutAbandonmentPaidByOrderId = async () => {
        throw new Error('duplicate payment must not mark checkout abandonment paid');
      };
      orderApi.getOrderConnection = async () => {
        throw new Error('duplicate payment must not open settlement transaction');
      };
      orderApi.selectOrderItemQtyRows = async () => {
        throw new Error('duplicate payment must not read order items for sales increment');
      };
      orderApi.incrementProductSales = async () => {
        throw new Error('duplicate payment must not increment product sales');
      };
      orderApi.insertOrderNotification = async () => {
        throw new Error('duplicate payment must not insert paid notification');
      };

      const result = await paymentService.handleStripeEvent({
        id: 'evt_race_2',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_2',
            amount: 1200,
            currency: 'myr',
            created: Math.floor(Date.now() / 1000),
            metadata: { order_id: 'o1' },
          },
        },
      });

      assert.equal(result.handled, true);
      assert.equal(result.duplicate, true);
      assert.equal(updateAttempted, 1);
    } finally {
      orderApi.insertWebhookEventIfAbsent = original.insertWebhookEventIfAbsent;
      orderApi.selectOrderById = original.selectOrderById;
      orderApi.updateOrderPaid = original.updateOrderPaid;
      orderApi.markCheckoutAbandonmentPaidByOrderId = original.markCheckoutAbandonmentPaidByOrderId;
      orderApi.getOrderConnection = original.getOrderConnection;
      orderApi.selectOrderItemQtyRows = original.selectOrderItemQtyRows;
      orderApi.incrementProductSales = original.incrementProductSales;
      orderApi.insertOrderNotification = original.insertOrderNotification;
    }
  });

  test('skips duplicated webhook event_id', async () => {
    const original = {
      insertWebhookEventIfAbsent: orderApi.insertWebhookEventIfAbsent,
      selectOrderById: orderApi.selectOrderById,
      updateOrderPaid: orderApi.updateOrderPaid,
      insertOrderNotification: orderApi.insertOrderNotification,
    };
    let updated = 0;
    try {
      orderApi.insertWebhookEventIfAbsent = async () => false;
      orderApi.selectOrderById = async () => ({
        id: 'o1',
        user_id: 'u1',
        order_no: 'NO1',
        total_amount: '12.00',
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'online',
      });
      orderApi.updateOrderPaid = async () => { updated += 1; };
      orderApi.insertOrderNotification = async () => {};

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
      orderApi.insertWebhookEventIfAbsent = original.insertWebhookEventIfAbsent;
      orderApi.selectOrderById = original.selectOrderById;
      orderApi.updateOrderPaid = original.updateOrderPaid;
      orderApi.insertOrderNotification = original.insertOrderNotification;
    }
  });
});
