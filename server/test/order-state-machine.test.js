/**
 * 订单履约 / 支付状态机单测（不连库）
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertFulfillmentTransition,
  assertPaymentTransition,
  paymentStatusAfterFulfillmentChange,
  canUserCancel,
  canShip,
} = require('../src/modules/order/orderStateMachine');
const { BusinessError } = require('../src/errors/BusinessError');

describe('orderStateMachine', () => {
  test('fulfillment: pending -> paid allowed', () => {
    assert.doesNotThrow(() => assertFulfillmentTransition('pending', 'paid'));
  });

  test('fulfillment: paid -> shipped allowed', () => {
    assert.doesNotThrow(() => assertFulfillmentTransition('paid', 'shipped'));
  });

  test('fulfillment: pending -> shipped forbidden', () => {
    assert.throws(
      () => assertFulfillmentTransition('pending', 'shipped'),
      (e) => e instanceof BusinessError,
    );
  });

  test('payment: pending -> paid after fulfillment pending->paid', () => {
    assert.equal(paymentStatusAfterFulfillmentChange('pending', 'paid', 'pending'), 'paid');
  });

  test('payment: refunded when fulfillment refunded', () => {
    assert.equal(paymentStatusAfterFulfillmentChange('refunding', 'refunded', 'paid'), 'refunded');
  });

  test('canUserCancel: pending + payment pending', () => {
    assert.equal(canUserCancel({ status: 'pending', payment_status: 'pending' }), true);
  });

  test('canUserCancel: pending but paid forbidden', () => {
    assert.equal(canUserCancel({ status: 'pending', payment_status: 'paid' }), false);
  });

  test('canShip: paid + paid', () => {
    assert.equal(canShip({ status: 'paid', payment_status: 'paid' }), true);
  });

  test('canShip: paid + pending forbidden', () => {
    assert.equal(canShip({ status: 'paid', payment_status: 'pending' }), false);
  });

  test('assertPaymentTransition: paid -> refunded', () => {
    assert.doesNotThrow(() => assertPaymentTransition('paid', 'refunded'));
  });
});
