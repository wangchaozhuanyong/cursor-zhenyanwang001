const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readRepositorySource() {
  return fs.readFileSync(
    path.join(__dirname, '../src/modules/admin/repository/adminOrder.repository.js'),
    'utf8',
  );
}

function readServiceSource() {
  return fs.readFileSync(
    path.join(__dirname, '../src/modules/admin/service/adminOrder.service.js'),
    'utf8',
  );
}

function extractSelectOrdersAdminPage(source) {
  const start = source.indexOf('async function selectOrdersAdminPage');
  const end = source.indexOf('\nasync function selectOrdersForExport', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

test('admin order list page query keeps heavy aggregates out of the page select', () => {
  const source = readRepositorySource();
  const pageQuery = extractSelectOrdersAdminPage(source);

  assert.match(source, /SELECT\s+\$\{pageIndexHint\}o\.id\s+FROM orders o/i);
  assert.match(pageQuery, /selectOrderPageRows\(where, params, pageSize, offset, pageJoinSql\)/);
  assert.match(pageQuery, /WHERE o\.id IN \(\$\{orderPlaceholders\}\)/i);
  assert.match(pageQuery, /ORDER BY FIELD\(o\.id, \$\{orderPlaceholders\}\)/i);
  assert.doesNotMatch(pageQuery, /LEFT JOIN\s+\(\s*SELECT[\s\S]+GROUP BY user_id/i);
  assert.doesNotMatch(pageQuery, /LEFT JOIN\s+\(\s*SELECT[\s\S]+FROM order_items[\s\S]+GROUP BY order_id/i);
  assert.doesNotMatch(pageQuery, /LEFT JOIN\s+\(\s*SELECT[\s\S]+FROM return_requests[\s\S]+GROUP BY order_id/i);
  assert.match(source, /WHERE order_id IN \(\?\)/i);
  assert.match(source, /WHERE user_id IN \(\?\)/i);
});

test('admin order list page query hints existing indexes for common filtered pages', () => {
  const source = readRepositorySource();

  assert.match(source, /function selectOrderPageIndexHint/);
  assert.match(source, /idx_orders_admin_status_payment_created/);
  assert.match(source, /idx_orders_unpaid_timeout/);
  assert.match(source, /const pageIndexHint = selectOrderPageIndexHint\(where\)/);
});

test('admin overdue payment filter keeps payment status index-friendly', () => {
  const source = readServiceSource();

  assert.doesNotMatch(source, /COALESCE\(o\.payment_status,\s*'pending'\)\s*=\s*'pending'/);
  assert.match(source, /\(o\.payment_status = 'pending' OR o\.payment_status IS NULL\)/);
});

test('admin overdue shipment page query splits paid statuses before final merge', () => {
  const source = readRepositorySource();

  assert.match(source, /function selectOverdueShipmentOrderPageRows/);
  assert.match(source, /UNION ALL/);
  assert.match(source, /overdue_order_candidates/);
  assert.match(source, /const candidateLimit = pageSize \+ offset/);
  assert.match(source, /overdueShipmentWhereForPaymentStatus\(where, 'paid'\)/);
  assert.match(source, /overdueShipmentWhereForPaymentStatus\(where, 'partially_refunded'\)/);
});
