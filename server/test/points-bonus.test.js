const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolvePointsBonusForPricing,
  filterPointsBonusActivitiesForUser,
} = require('../src/modules/loyalty/service/pointsBonusResolver.service');
const { calculateOrderEarnedPoints } = require('../src/modules/loyalty/service/pointsEngine.service');

const baseSettings = {
  display_enabled: 1,
  earn_enabled: 1,
  earn_mode: 'amount',
  earn_currency_unit: 1,
  earn_points_unit: 1,
  earn_rounding: 'floor',
};

test('resolvePointsBonusForPricing picks max multiplier across activities', () => {
  const resolved = resolvePointsBonusForPricing({
    orderGoodsAmount: 100,
    orderItems: [{ productId: 'p1', qty: 1, price: 100 }],
    productMap: { p1: { id: 'p1', category_id: 'c1' } },
    pointsBonusActivities: [
      {
        activity_id: 'a1',
        title: '双倍',
        scope_type: 'all',
        activity_config: { multiplier_percent: 200, apply_scope: 'all' },
        scopes: [],
      },
      {
        activity_id: 'a2',
        title: '三倍',
        scope_type: 'product',
        activity_config: { multiplier_percent: 300, apply_scope: 'matched_items' },
        scopes: [{ scope_type: 'product', scope_id: 'p1' }],
      },
    ],
  });
  assert.equal(resolved.item_results[0].points_bonus_multiplier_percent, 300);
});

test('calculateOrderEarnedPoints applies member and points_bonus multipliers on eligible lines', () => {
  const result = calculateOrderEarnedPoints({
    settings: baseSettings,
    memberLevel: { points_multiplier: 2 },
    orderItems: [
      {
        product_id: 'p1',
        qty: 1,
        price: 100,
        subtotal: 100,
        line_paid_amount: 100,
        points_bonus_multiplier_percent: 200,
        points_bonus_activity_id: 'bonus-1',
        points_bonus_activity_title: '双倍',
      },
    ],
    productMap: { p1: { id: 'p1' } },
  });
  assert.equal(result.earned_points, 400);
});

test('points_bonus does not revive lines blocked by no_points rule', () => {
  const rules = [
    { id: 'r1', scope_type: 'product', scope_id: 'p1', earn_mode: 'no_points', priority: 1, enabled: 1, earn_enabled: 1 },
  ];
  const result = calculateOrderEarnedPoints({
    settings: { ...baseSettings, earn_mode: 'amount_plus_product_rule' },
    productRules: rules,
    orderItems: [{
      product_id: 'p1',
      qty: 1,
      price: 100,
      subtotal: 100,
      line_paid_amount: 100,
      points_bonus_multiplier_percent: 300,
    }],
    productMap: { p1: { id: 'p1' } },
  });
  assert.equal(result.earned_points, 0);
  assert.equal(result.item_results[0].reason, 'rule_no_points');
});

test('resolvePointsBonusForPricing applies birthday activity in window', () => {
  const resolved = resolvePointsBonusForPricing({
    orderGoodsAmount: 50,
    orderItems: [{ productId: 'p1', qty: 1, price: 50 }],
    productMap: { p1: { id: 'p1' } },
    userContext: {
      birthday: '1990-06-05',
      today: '2024-06-05',
      consumedBirthdayActivityIds: [],
    },
    pointsBonusActivities: [
      {
        activity_id: 'birthday-1',
        title: '生日双倍',
        scope_type: 'all',
        activity_config: {
          bonus_kind: 'birthday',
          multiplier_percent: 200,
          apply_scope: 'all',
          birthday_window_before_days: 0,
          birthday_window_after_days: 7,
        },
        scopes: [],
      },
    ],
  });
  assert.equal(resolved.item_results[0].points_bonus_multiplier_percent, 200);
  assert.equal(resolved.item_results[0].points_bonus_bonus_kind, 'birthday');
});

test('filterPointsBonusActivitiesForUser keeps normal holiday activities', () => {
  const filtered = filterPointsBonusActivitiesForUser([
    { activity_id: 'h1', activity_config: { bonus_kind: 'holiday', multiplier_percent: 300 } },
  ], { birthday: null });
  assert.equal(filtered.length, 1);
});

test('max_bonus_points caps final earned total', () => {
  const result = calculateOrderEarnedPoints({
    settings: baseSettings,
    maxBonusPoints: 50,
    orderItems: [{
      product_id: 'p1',
      qty: 1,
      price: 100,
      subtotal: 100,
      line_paid_amount: 100,
      points_bonus_multiplier_percent: 200,
    }],
    productMap: { p1: { id: 'p1' } },
  });
  assert.equal(result.earned_points, 50);
});
