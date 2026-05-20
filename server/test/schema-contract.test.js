const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isSchemaDriftError } = require('../src/db/schemaErrors');
const { CRITICAL_ADMIN_MIGRATIONS } = require('../src/db/schemaContract');

test('isSchemaDriftError detects missing column/table', () => {
  assert.equal(isSchemaDriftError({ code: 'ER_BAD_FIELD_ERROR', message: "Unknown column 'refunded_amount'" }), true);
  assert.equal(isSchemaDriftError({ code: 'ER_NO_SUCH_TABLE', message: "Table 'notification_logs' doesn't exist" }), true);
  assert.equal(isSchemaDriftError({ code: 'ECONNREFUSED' }), false);
});

test('CRITICAL_ADMIN_MIGRATIONS includes refunded_amount migration', () => {
  assert.ok(CRITICAL_ADMIN_MIGRATIONS.includes('096_orders_refunded_amount'));
});
