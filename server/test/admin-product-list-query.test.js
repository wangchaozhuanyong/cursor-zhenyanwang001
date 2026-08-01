const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  PRODUCT_COUNT_FROM,
  PRODUCT_LIST_FROM,
  buildProductSalesMetricsRefreshQuery,
  resolveProductListOrderBy,
  SORT_ORDER_SQL,
} = require('../src/modules/admin/repository/adminProductListQuery');
const {
  buildProductMediaFilterSql,
} = require('../src/modules/admin/service/adminProductMediaFilter');
const {
  adminProductListQuerySchema,
} = require('../src/modules/admin/schemas/adminProduct.schemas');

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

test('product count query source stays lightweight', () => {
  assert.match(PRODUCT_COUNT_FROM, /FROM\s+products\s+p/i);
  assert.doesNotMatch(PRODUCT_COUNT_FROM, /order_items|product_variants|GROUP\s+BY/i);
});

test('product list reads sales metrics from cache by default', () => {
  assert.match(PRODUCT_LIST_FROM, /product_sales_metrics_cache/i);
  assert.doesNotMatch(PRODUCT_LIST_FROM, /FROM\s+order_items|INNER\s+JOIN\s+orders/i);
});

test('product sales metrics refresh query owns the heavy aggregation', () => {
  const sql = buildProductSalesMetricsRefreshQuery();
  assert.match(sql, /INSERT\s+INTO\s+product_sales_metrics_cache/i);
  assert.match(sql, /FROM\s+order_items/i);
  assert.match(sql, /ON\s+DUPLICATE\s+KEY\s+UPDATE/i);
});

test('product media filter accepts a cover or an enabled variant image', () => {
  const normal = buildProductMediaFilterSql('normal');
  const missing = buildProductMediaFilterSql('missing');

  assert.match(normal, /p\.cover_image/i);
  assert.match(normal, /product_variants\s+media_variant/i);
  assert.match(normal, /media_variant\.enabled\s*=\s*1/i);
  assert.match(missing, /AND\s+NOT/i);
  assert.equal(buildProductMediaFilterSql('invalid'), '');
});

test('product list exposes an effective cover image for admin repair work', () => {
  assert.match(PRODUCT_LIST_FROM, /default_variant_image_url/i);
  assert.match(PRODUCT_LIST_FROM, /any_variant_image_url/i);
});

test('admin product query schema accepts only supported media filters', () => {
  assert.equal(adminProductListQuerySchema.safeParse({ media_status: 'missing' }).success, true);
  assert.equal(adminProductListQuerySchema.safeParse({ media_status: 'normal' }).success, true);
  assert.equal(adminProductListQuerySchema.safeParse({ media_status: 'broken' }).success, false);
});
