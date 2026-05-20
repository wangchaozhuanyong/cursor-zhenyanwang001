const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ACTIVE_RETURN_STATUS_LIST,
  ORDER_REFUNDING_STATUSES,
  orderAfterSalePredicate,
} = require('../src/modules/order/orderAfterSale');

test('orderAfterSalePredicate includes refunding statuses and active return_requests filter', () => {
  const sql = orderAfterSalePredicate('o');
  assert.match(sql, /return_requests rr/);
  assert.match(sql, /rr\.status IN/);
  assert.match(sql, /o\.status IN \(\?, \?\)/);
  assert.equal(ORDER_REFUNDING_STATUSES.length, 2);
  assert.ok(ACTIVE_RETURN_STATUS_LIST.includes('pending'));
  assert.ok(ACTIVE_RETURN_STATUS_LIST.includes('exchange_shipping'));
});
