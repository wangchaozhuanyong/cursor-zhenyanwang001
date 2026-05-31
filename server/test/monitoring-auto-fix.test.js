const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const autoFix = require('../src/modules/monitoring/service/autoFix.service');

describe('monitoring autoFix eligibility', () => {
  test('allows automated repair for stock mismatch when auto_fix enabled', () => {
    const dbRule = { code: 'PRODUCT_STOCK_MISMATCH', auto_fix_enabled: 1 };
    const anomaly = {
      rule_code: 'PRODUCT_STOCK_MISMATCH',
      status: 'open',
      evidence: {
        autoFixable: true,
        repairSuggestion: { repairType: 'sync_product_stock_from_variants' },
      },
    };
    assert.equal(autoFix.isAutoFixCandidate(dbRule, anomaly), true);
  });

  test('blocks financial rules even when auto_fix enabled', () => {
    const dbRule = { code: 'PAYMENT_SUCCESS_ORDER_UNPAID', auto_fix_enabled: 1 };
    const anomaly = {
      rule_code: 'PAYMENT_SUCCESS_ORDER_UNPAID',
      status: 'open',
      evidence: { autoFixable: true, repairSuggestion: { repairType: 'manual_review' } },
    };
    assert.equal(autoFix.isAutoFixCandidate(dbRule, anomaly), false);
  });

  test('only exposes auto-fix for low-risk automated rules', () => {
    assert.equal(autoFix.isRuleAutoFixAllowed('PRODUCT_STOCK_MISMATCH'), true);
    assert.equal(autoFix.isRuleAutoFixAllowed('CACHE_STALE_AFTER_ADMIN_UPDATE'), true);
    assert.equal(autoFix.isRuleAutoFixAllowed('USER_STATS_MISMATCH'), true);
    assert.equal(autoFix.isRuleAutoFixAllowed('PRODUCT_SEARCH_KEYWORDS_MISMATCH'), true);
    assert.equal(autoFix.isRuleAutoFixAllowed('ANALYTICS_PAYMENT_SUCCESS_MISSING'), true);
    assert.equal(autoFix.isRuleAutoFixAllowed('POINTS_BALANCE_MISMATCH'), false);
    assert.equal(autoFix.isRuleAutoFixAllowed('FILE_OBJECT_MISSING'), false);
  });

  test('blocks enabled auto_fix when the rule itself is not automated', () => {
    const dbRule = { code: 'FILE_OBJECT_MISSING', auto_fix_enabled: 1 };
    const anomaly = {
      rule_code: 'FILE_OBJECT_MISSING',
      status: 'open',
      evidence: {
        autoFixable: true,
        repairSuggestion: { repairType: 'clear_cache_key' },
      },
    };
    assert.equal(autoFix.isAutoFixCandidate(dbRule, anomaly), false);
  });

  test('blocks unsupported repair types', () => {
    const dbRule = { code: 'SKU_NEGATIVE_STOCK', auto_fix_enabled: 1 };
    const anomaly = {
      rule_code: 'SKU_NEGATIVE_STOCK',
      status: 'open',
      evidence: {
        autoFixable: false,
        repairSuggestion: { repairType: 'manual_inventory_review' },
      },
    };
    assert.equal(autoFix.isAutoFixCandidate(dbRule, anomaly), false);
  });
});
