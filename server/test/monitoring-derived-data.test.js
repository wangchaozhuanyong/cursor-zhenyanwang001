const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const repo = require('../src/modules/monitoring/repository/monitoring.repository');
const searchRules = require('../src/modules/monitoring/rules/searchIndex.rules');
const analyticsRules = require('../src/modules/monitoring/rules/analytics.rules');

const originals = {};

function stubRepo(patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in originals)) originals[key] = repo[key];
    repo[key] = value;
  }
}

function restoreRepo() {
  for (const [key, value] of Object.entries(originals)) {
    repo[key] = value;
    delete originals[key];
  }
}

describe('monitoring derived data rules', () => {
  beforeEach(restoreRepo);
  afterEach(restoreRepo);

  test('detects stale product search keywords and marks them auto-fixable', async () => {
    stubRepo({
      tableExists: async (table) => table === 'products',
      columnExists: async (table, column) => table === 'products' && column === 'search_keywords',
      selectProductSearchKeywordRows: async () => [{
        id: 'p1',
        name: 'Test Product',
        search_keywords: 'old keyword',
        expected_search_keywords: 'test product sku-a gold-tag',
      }],
    });

    const result = await searchRules.PRODUCT_SEARCH_KEYWORDS_MISMATCH();

    assert.equal(result.checkedCount, 1);
    assert.equal(result.anomalies.length, 1);
    assert.equal(result.anomalies[0].ruleCode, 'PRODUCT_SEARCH_KEYWORDS_MISMATCH');
    assert.equal(result.anomalies[0].autoFixable, true);
    assert.equal(result.anomalies[0].repairSuggestion.repairType, 'rebuild_product_search_keywords');
  });

  test('keeps search rule quiet when stored index matches expected index', async () => {
    stubRepo({
      tableExists: async (table) => table === 'products',
      columnExists: async (table, column) => table === 'products' && column === 'search_keywords',
      selectProductSearchKeywordRows: async () => [{
        id: 'p1',
        name: 'Test Product',
        search_keywords: 'test product sku-a',
        expected_search_keywords: 'test product sku-a',
      }],
    });

    const result = await searchRules.PRODUCT_SEARCH_KEYWORDS_MISMATCH();

    assert.equal(result.checkedCount, 1);
    assert.equal(result.anomalies.length, 0);
  });

  test('detects paid orders missing server-side payment_success analytics event', async () => {
    stubRepo({
      tableExists: async (table) => table === 'orders' || table === 'analytics_events',
      columnExists: async (table, column) => table === 'analytics_events' && column === 'order_id',
      selectPaidOrdersMissingPaymentSuccessEvents: async () => [{
        id: 'o1',
        order_no: 'NO-1',
        user_id: 'u1',
        payment_status: 'paid',
        status: 'paid',
        amount: 99.5,
      }],
    });

    const result = await analyticsRules.ANALYTICS_PAYMENT_SUCCESS_MISSING();

    assert.equal(result.checkedCount, 1);
    assert.equal(result.anomalies.length, 1);
    assert.equal(result.anomalies[0].ruleCode, 'ANALYTICS_PAYMENT_SUCCESS_MISSING');
    assert.equal(result.anomalies[0].autoFixable, true);
    assert.equal(result.anomalies[0].repairSuggestion.repairType, 'backfill_payment_success_analytics_event');
  });

  test('builds product search index from product, sku and tag fields', () => {
    const expected = repo.buildExpectedProductSearchKeywords({
      name: 'Alpha Bag',
      description: 'Travel',
      category_id: 'cat-1',
      variant_titles: 'Large\nSmall',
      sku_codes: 'SKU-L\nSKU-S',
      tag_names: 'Featured\nGift',
    });

    assert.match(expected, /Alpha Bag/);
    assert.match(expected, /Travel/);
    assert.match(expected, /Large/);
    assert.match(expected, /SKU-S/);
    assert.match(expected, /Gift/);
  });
});
