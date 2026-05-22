/**
 * Unit tests: product/tag admin mutations must match high-risk MFA route rules.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { isHighRiskAdminOperation } = require('../src/modules/admin/adminHighRiskRoutes');

function req(method, path) {
  return { method, path };
}

describe('admin high-risk product routes', () => {
  const productMutations = [
    ['POST', '/products'],
    ['POST', '/products/import'],
    ['PUT', '/products/prod-1'],
    ['PUT', '/products/prod-1/tags'],
    ['PATCH', '/products/prod-1/status'],
    ['DELETE', '/products/prod-1'],
    ['POST', '/products/batch-status'],
  ];

  for (const [method, path] of productMutations) {
    test(`${method} ${path} is high-risk`, () => {
      assert.equal(isHighRiskAdminOperation(req(method, path)), true);
    });
  }

  const tagMutations = [
    ['POST', '/product-tags'],
    ['PUT', '/product-tags/tag-1'],
    ['DELETE', '/product-tags/tag-1'],
  ];

  for (const [method, path] of tagMutations) {
    test(`${method} ${path} is high-risk`, () => {
      assert.equal(isHighRiskAdminOperation(req(method, path)), true);
    });
  }

  test('GET /products is not high-risk', () => {
    assert.equal(isHighRiskAdminOperation(req('GET', '/products')), false);
  });

  test('GET /products/:id is not high-risk', () => {
    assert.equal(isHighRiskAdminOperation(req('GET', '/products/prod-1')), false);
  });

  test('GET /product-tags is not high-risk', () => {
    assert.equal(isHighRiskAdminOperation(req('GET', '/product-tags')), false);
  });

  test('PUT /recycle-bin/:id/restore is high-risk', () => {
    assert.equal(isHighRiskAdminOperation(req('PUT', '/recycle-bin/item-1/restore')), true);
  });
});
