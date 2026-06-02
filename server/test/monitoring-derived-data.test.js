const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const repo = require('../src/modules/monitoring/repository/monitoring.repository');
const searchRules = require('../src/modules/monitoring/rules/searchIndex.rules');
const analyticsRules = require('../src/modules/monitoring/rules/analytics.rules');
const orderStockRules = require('../src/modules/monitoring/rules/orderStock.rules');
const fileRules = require('../src/modules/monitoring/rules/file.rules');

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

  test('detects payment_success events with missing search keyword', async () => {
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
        expected_keyword: 'gift box',
        payment_success_event_id: 123,
        payment_success_keyword: '',
      }],
    });

    const result = await analyticsRules.ANALYTICS_PAYMENT_SUCCESS_MISSING();

    assert.equal(result.checkedCount, 1);
    assert.equal(result.anomalies.length, 1);
    assert.equal(result.anomalies[0].actualValue.paymentSuccessEventExists, true);
    assert.equal(result.anomalies[0].diffValue.missingKeyword, true);
    assert.equal(result.anomalies[0].evidence.anomalyKind, 'payment_success_keyword_missing');
  });

  test('backfill payment_success analytics keeps search keyword and updates existing event idempotently', async () => {
    const originalQuery = repo.db.query;
    const updates = [];
    repo.db.query = async (sql, params = []) => {
      if (/INFORMATION_SCHEMA\.COLUMNS/i.test(sql)) return [[{ c: 1 }]];
      if (/SELECT id, order_no, user_id, payment_status, status/i.test(sql)) {
        return [[{
          id: 'o1',
          order_no: 'NO-1',
          user_id: 'u1',
          payment_status: 'paid',
          status: 'paid',
          amount: 99.5,
          expected_keyword: 'gift box',
          payment_success_event_id: 123,
        }]];
      }
      if (/UPDATE analytics_events/i.test(sql)) {
        updates.push({ sql, params });
        return [{ affectedRows: 1 }];
      }
      throw new Error(`unexpected query: ${sql}`);
    };

    try {
      const result = await repo.backfillPaymentSuccessAnalyticsEvent('o1');

      assert.equal(result.updatedExistingEventId, 123);
      assert.equal(result.keyword, 'gift box');
      assert.equal(updates.length, 1);
      assert.match(updates[0].sql, /WHERE id = \?/);
      assert.deepEqual(updates[0].params, ['gift box', 'gift box', 99.5, 123]);
    } finally {
      repo.db.query = originalQuery;
    }
  });

  test('user statistics rule avoids reserved SQL aliases', async () => {
    const originalQuery = repo.db.query;
    const captured = [];
    repo.db.query = async (sql) => {
      captured.push(sql);
      if (/INFORMATION_SCHEMA\.COLUMNS/i.test(sql)) return [[{ c: 1 }]];
      if (/SELECT u\.id AS user_id/i.test(sql)) return [[]];
      throw new Error(`unexpected query: ${sql}`);
    };

    try {
      const rows = await repo.selectUserStatsMismatches();
      assert.deepEqual(rows, []);
      const statsSql = captured.find((sql) => /SELECT u\.id AS user_id/i.test(sql));
      assert.match(statsSql, /real_stats/);
      assert.doesNotMatch(statsSql, /\)\s+real\s+ON/i);
      assert.doesNotMatch(statsSql, /\breal\./i);
    } finally {
      repo.db.query = originalQuery;
    }
  });

  test('cancelled order stock monitor accepts order_release as release evidence', async () => {
    const originalQuery = repo.db.query;
    const captured = [];
    repo.db.query = async (sql) => {
      captured.push(sql);
      if (/SELECT o\.id, o\.order_no, o\.updated_at/i.test(sql)) return [[]];
      throw new Error(`unexpected query: ${sql}`);
    };

    try {
      const rows = await repo.selectCancelledOrdersWithoutStockRestore();
      assert.deepEqual(rows, []);
      const stockSql = captured.find((sql) => /inventory_stock_records/i.test(sql));
      assert.match(stockSql, /'order_release'/);
    } finally {
      repo.db.query = originalQuery;
    }
  });

  test('cancelled order stock monitor uses readable Chinese anomaly text', async () => {
    stubRepo({
      tableExists: async (table) => table === 'inventory_stock_records',
      selectCancelledOrdersWithoutStockRestore: async () => [{
        id: 'o1',
        order_no: '#1001',
        updated_at: '2026-06-02T00:00:00.000Z',
        restore_records: 0,
      }],
    });

    const result = await orderStockRules.ORDER_CANCELLED_STOCK_NOT_RESTORED();
    const anomaly = result.anomalies[0];

    assert.equal(result.checkedCount, 1);
    assert.match(anomaly.title, /取消订单缺少库存释放证据/);
    assert.equal(anomaly.rootCauseCode, 'ORDER_CANCELLED_STOCK_NOT_RESTORED');
    // encoding-check: ignore-next-line
    assert.doesNotMatch(JSON.stringify(anomaly), /鍙|璁|搴|�/);
  });

  test('file monitor accepts static assets from configured public roots', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'file-monitor-root-'));
    const assetDir = path.join(tempRoot, 'assets', 'home-banners');
    fs.mkdirSync(assetDir, { recursive: true });
    fs.writeFileSync(path.join(assetDir, 'hero.webp'), 'test');
    const originalRoots = process.env.FILE_MONITOR_PUBLIC_ROOTS;
    process.env.FILE_MONITOR_PUBLIC_ROOTS = tempRoot;
    stubRepo({
      selectFileReferenceRows: async () => ({
        products: [],
        variants: [],
        banners: [{ id: 'b1', title: '首页 Banner', image: '/assets/home-banners/hero.webp' }],
      }),
    });

    try {
      const result = await fileRules.FILE_OBJECT_MISSING();
      assert.equal(result.checkedCount, 0);
      assert.deepEqual(result.anomalies, []);
    } finally {
      if (originalRoots === undefined) {
        delete process.env.FILE_MONITOR_PUBLIC_ROOTS;
      } else {
        process.env.FILE_MONITOR_PUBLIC_ROOTS = originalRoots;
      }
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
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
