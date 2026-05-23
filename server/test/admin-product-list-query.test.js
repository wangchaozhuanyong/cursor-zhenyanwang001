const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveProductListOrderBy,
  SORT_ORDER_SQL,
} = require('../src/modules/admin/repository/adminProductListQuery');

test('resolveProductListOrderBy returns known sort clauses', () => {
  assert.equal(resolveProductListOrderBy('price_desc'), SORT_ORDER_SQL.price_desc);
  assert.match(resolveProductListOrderBy('price_desc'), /p\.price/);
  assert.equal(resolveProductListOrderBy('margin_desc'), SORT_ORDER_SQL.margin_desc);
  assert.match(resolveProductListOrderBy('margin_desc'), /gross_margin_30d/);
  assert.equal(resolveProductListOrderBy('name_asc'), SORT_ORDER_SQL.name_asc);
  assert.match(resolveProductListOrderBy('sku_desc'), /min_sku_code/);
  assert.match(resolveProductListOrderBy('category_asc'), /c\.name/);
});

test('resolveProductListOrderBy falls back to created_desc', () => {
  assert.equal(resolveProductListOrderBy(''), SORT_ORDER_SQL.created_desc);
  assert.equal(resolveProductListOrderBy('invalid'), SORT_ORDER_SQL.created_desc);
});
