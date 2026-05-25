const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  orderEffectivePayableSql,
  orderEffectivePaidSql,
} = require('../src/db/schemaContract');
const {
  resolveOrderPayableAmount,
  resolveOrderPaidAmount,
} = require('../src/utils/orderAmountResolve');

const schemaFull = {
  ordersPayableAmount: true,
  ordersPaidAmount: true,
  ordersAmountSnapshot: true,
  ordersRawAmount: true,
};

test('orderEffectivePayableSql falls back through payable, total, snapshot, raw', () => {
  const sql = orderEffectivePayableSql('o', schemaFull);
  assert.match(sql, /NULLIF\(o\.payable_amount, 0\)/);
  assert.match(sql, /NULLIF\(o\.total_amount, 0\)/);
  assert.match(sql, /amount_snapshot/);
  assert.match(sql, /NULLIF\(o\.raw_amount, 0\)/);
});

test('orderEffectivePaidSql uses paid_amount then payable when paid status', () => {
  const sql = orderEffectivePaidSql('o', schemaFull);
  assert.match(sql, /NULLIF\(o\.paid_amount, 0\)/);
  assert.match(sql, /payment_status IN/);
});

test('resolveOrderPayableAmount prefers first positive field', () => {
  assert.equal(resolveOrderPayableAmount({ payable_amount: 10, total_amount: 0, raw_amount: 5 }), 10);
  assert.equal(resolveOrderPayableAmount({ payable_amount: 0, total_amount: 20, raw_amount: 5 }), 20);
  assert.equal(resolveOrderPayableAmount({ payable_amount: 0, total_amount: 0, raw_amount: 15 }), 15);
  assert.equal(
    resolveOrderPayableAmount({
      payable_amount: 0,
      total_amount: 0,
      raw_amount: 0,
      amount_snapshot: JSON.stringify({ payable_amount: 88 }),
    }),
    88,
  );
});

test('resolveOrderPaidAmount uses payable when order is paid', () => {
  assert.equal(
    resolveOrderPaidAmount({ payment_status: 'paid', paid_amount: 0, total_amount: 0, raw_amount: 30 }),
    30,
  );
  assert.equal(
    resolveOrderPaidAmount({ payment_status: 'pending', paid_amount: 0, total_amount: 25 }),
    0,
  );
});
