const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { shouldSettleByTiming } = require('../src/modules/user/service/reward.service');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../src/constants/status');

describe('shouldSettleByTiming', () => {
  const paidOrder = { status: ORDER_STATUS.PAID, payment_status: PAYMENT_STATUS.PAID };
  const shippedOrder = { status: ORDER_STATUS.SHIPPED, payment_status: PAYMENT_STATUS.PAID };
  const completedOrder = { status: ORDER_STATUS.COMPLETED, payment_status: PAYMENT_STATUS.PAID };
  const pendingOrder = { status: ORDER_STATUS.PENDING, payment_status: PAYMENT_STATUS.PENDING };

  it('order_paid settles when paid or trigger mentions paid', () => {
    assert.equal(shouldSettleByTiming('order_paid', paidOrder, 'order_paid'), true);
    assert.equal(shouldSettleByTiming('order_paid', pendingOrder, 'order_paid'), true);
    assert.equal(shouldSettleByTiming('order_paid', pendingOrder, ''), false);
    assert.equal(shouldSettleByTiming('order_paid', completedOrder, ''), true);
  });

  it('order_completed requires completed status or confirm trigger', () => {
    assert.equal(shouldSettleByTiming('order_completed', completedOrder, ''), true);
    assert.equal(shouldSettleByTiming('order_completed', shippedOrder, 'user_confirm_receive'), true);
    assert.equal(shouldSettleByTiming('order_completed', paidOrder, ''), false);
    assert.equal(shouldSettleByTiming('order_completed', paidOrder, 'order_paid'), false);
  });

  it('order_shipped requires shipped or completed', () => {
    assert.equal(shouldSettleByTiming('order_shipped', shippedOrder, ''), true);
    assert.equal(shouldSettleByTiming('order_shipped', paidOrder, ''), false);
  });
});
