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
