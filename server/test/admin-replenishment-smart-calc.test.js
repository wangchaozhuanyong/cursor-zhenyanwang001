const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { _internal } = require('../src/modules/admin/service/adminReplenishment.service');

const params = {
  strategy: 'balanced',
  analysis_days: 30,
  lead_time_days: 5,
  safety_stock_days: 3,
  target_cover_days: 20,
  min_floor_stock: 0,
  purchase_multiple: 1,
};

describe('smart replenishment calculation', () => {
  test('replenishes to upper limit and subtracts in-transit quantity', () => {
    const result = _internal.computeSmartReplenishmentSuggestion(
      { available_stock: 20, in_transit_qty: 10 },
      { snapshot_days: 30, sales_qty: 90, stockout_days: 0 },
      params,
    );

    assert.equal(result.suggestedLower, 24);
    assert.equal(result.suggestedUpper, 84);
    assert.equal(result.suggestedQty, 54);
    assert.equal(result.suggestionType, 'purchase');
  });

  test('rounds suggested quantity up to purchase multiple', () => {
    const result = _internal.computeSmartReplenishmentSuggestion(
      { available_stock: 20, in_transit_qty: 10 },
      { snapshot_days: 30, sales_qty: 90, stockout_days: 0 },
      { ...params, purchase_multiple: 12 },
    );

    assert.equal(result.suggestedQty, 60);
  });

  test('low-sales samples are watch-only and keep existing limits', () => {
    const result = _internal.computeSmartReplenishmentSuggestion(
      { available_stock: 5, in_transit_qty: 0, stock_lower_limit: 2, stock_upper_limit: 8 },
      { snapshot_days: 30, sales_qty: 2, stockout_days: 0 },
      params,
    );

    assert.equal(result.suggestionType, 'watch');
    assert.equal(result.suggestedLower, 2);
    assert.equal(result.suggestedUpper, 8);
    assert.equal(result.suggestedQty, 0);
  });

  test('uses unpack suggestion before purchase when parent package covers lower limit', () => {
    const result = _internal.computeSmartReplenishmentSuggestion(
      {
        available_stock: 0,
        in_transit_qty: 0,
        unpack_rule_id: 'rule-1',
        unpack_parent_variant_id: 'parent-1',
        unpack_parent_available_stock: 3,
        unpack_parent_qty: 1,
        unpack_child_qty: 10,
      },
      { snapshot_days: 30, sales_qty: 90, stockout_days: 0 },
      params,
    );

    assert.equal(result.suggestionType, 'unpack');
    assert.equal(result.suggestedQty, 0);
    assert.equal(result.suggestionPayload.suggested_unpack_parent_qty, 3);
    assert.equal(result.suggestionPayload.equivalent_stock, 30);
  });
});
