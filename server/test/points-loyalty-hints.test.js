const test = require('node:test');
const assert = require('node:assert/strict');
const { getOrderPointsHint } = require('../src/modules/loyalty/service/pointsLoyaltyHints');

test('getOrderPointsHint reflects configured settle timing', () => {
  assert.match(getOrderPointsHint('payment_success'), /支付成功/);
  assert.match(getOrderPointsHint('order_shipped'), /发货/);
  assert.match(getOrderPointsHint('order_completed'), /完成/);
  assert.equal(getOrderPointsHint('unknown'), getOrderPointsHint('order_completed'));
});
