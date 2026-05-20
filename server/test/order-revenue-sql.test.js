const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  netSalesExpr,
  refundedAmountExpr,
  orderNetRatioExpr,
  isPaidOrderExpr,
} = require('../src/utils/orderRevenueSql');

test('netSalesExpr with empty alias uses unqualified columns (dashboard/reports)', () => {
  const sql = netSalesExpr('');
  assert.doesNotMatch(sql, /\.\w/);
  assert.match(sql, /payment_status/);
  assert.match(sql, /refunded_amount/);
});

test('netSalesExpr with alias prefixes columns', () => {
  const sql = netSalesExpr('o');
  assert.match(sql, /o\.payment_status/);
  assert.match(sql, /o\.refunded_amount/);
});

test('refundedAmountExpr and isPaidOrderExpr support empty alias', () => {
  assert.equal(refundedAmountExpr(''), 'COALESCE(refunded_amount, 0)');
  assert.match(isPaidOrderExpr(''), /^payment_status IN/);
});

test('netSalesExpr without refunded_amount column uses gross total', () => {
  const sql = netSalesExpr('o', { includeRefundedAmount: false });
  assert.doesNotMatch(sql, /refunded_amount/);
  assert.match(sql, /o\.total_amount/);
});

test('orderNetRatioExpr without refunded_amount uses ratio 1', () => {
  const sql = orderNetRatioExpr('o', { includeRefundedAmount: false });
  assert.doesNotMatch(sql, /refunded_amount/);
  assert.match(sql, /THEN 1 ELSE 0/);
});
