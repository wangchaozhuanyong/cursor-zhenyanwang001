const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateOrderEarnedPoints,
  calculateMaxUsablePoints,
  resolveProductPointRule,
  roundPoints,
} = require('../src/modules/loyalty/service/pointsEngine.service');
const orderPricing = require('../src/modules/order/order.pricing');

const baseSettings = {
  display_enabled: 1,
  earn_enabled: 1,
  redeem_enabled: 1,
  earn_mode: 'amount_plus_product_rule',
  earn_currency_unit: 1,
  earn_points_unit: 1,
  earn_rounding: 'floor',
  point_value_myr: 0.01,
  points_per_currency: 100,
  min_redeem_points: 10,
  redeem_step: 1,
  max_redeem_percent: 30,
  max_redeem_amount: 0,
  min_order_amount: 0,
  redeem_scope: 'exclude_restricted',
};

test('roundPoints honors floor, round and ceil', () => {
  assert.equal(roundPoints(10.5, 'floor'), 10);
  assert.equal(roundPoints(10.5, 'round'), 11);
  assert.equal(roundPoints(10.1, 'ceil'), 11);
});

test('global amount earn grants RM1 = 1 point', () => {
  const result = calculateOrderEarnedPoints({
    settings: baseSettings,
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100 }],
  });
  assert.equal(result.earned_points, 100);
});

test('product rule beats category rule and fixed_per_item uses quantity', () => {
  const rules = [
    { id: 'cat', scope_type: 'category', scope_id: 'c1', earn_mode: 'no_points', priority: 1, enabled: 1, earn_enabled: 1 },
    { id: 'prod', scope_type: 'product', scope_id: 'p1', earn_mode: 'fixed_per_item', fixed_points: 5, priority: 100, enabled: 1, earn_enabled: 1 },
  ];
  const product = { id: 'p1', category_id: 'c1' };
  assert.equal(resolveProductPointRule(product, rules).id, 'prod');
  const result = calculateOrderEarnedPoints({
    settings: baseSettings,
    productRules: rules,
    productMap: { p1: product },
    orderItems: [{ product_id: 'p1', qty: 3, price: 100, subtotal: 300 }],
  });
  assert.equal(result.earned_points, 15);
});

test('fixed_per_order only grants once for the same rule', () => {
  const rule = { id: 'once', scope_type: 'category', scope_id: 'c1', earn_mode: 'fixed_per_order', fixed_points: 20, priority: 1, enabled: 1, earn_enabled: 1 };
  const result = calculateOrderEarnedPoints({
    settings: baseSettings,
    productRules: [rule],
    productMap: { p1: { id: 'p1', category_id: 'c1' }, p2: { id: 'p2', category_id: 'c1' } },
    orderItems: [
      { product_id: 'p1', qty: 1, price: 30, subtotal: 30 },
      { product_id: 'p2', qty: 1, price: 40, subtotal: 40 },
    ],
  });
  assert.equal(result.earned_points, 20);
});

test('amount_percent grants points from paid amount percent', () => {
  const result = calculateOrderEarnedPoints({
    settings: baseSettings,
    productRules: [{ id: 'pct', scope_type: 'product', scope_id: 'p1', earn_mode: 'amount_percent', points_percent: 10, enabled: 1, earn_enabled: 1 }],
    productMap: { p1: { id: 'p1' } },
    orderItems: [{ product_id: 'p1', qty: 1, price: 120, subtotal: 100, line_paid_amount: 100 }],
  });
  assert.equal(result.earned_points, 10);
});

test('member multiplier applies after base points', () => {
  const result = calculateOrderEarnedPoints({
    settings: baseSettings,
    memberLevel: { id: 'gold', points_multiplier: 2 },
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100 }],
  });
  assert.equal(result.earned_points, 200);
});

test('max usable points honors cap and redeem step clamp', () => {
  const result = calculateMaxUsablePoints({
    settings: { ...baseSettings, redeem_step: 10 },
    userPointsBalance: 5000,
    pointsToUse: 255,
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100 }],
  });
  assert.equal(result.max_usable_points, 3000);
  assert.equal(result.points_used, 250);
  assert.equal(result.points_discount_amount, 2.5);
  assert.equal(result.adjusted, true);
});

test('max usable points is floored to redeem step when balance is the cap', () => {
  const result = calculateMaxUsablePoints({
    settings: { ...baseSettings, redeem_step: 10, max_redeem_percent: 100 },
    userPointsBalance: 255,
    pointsToUse: 255,
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100 }],
  });
  assert.equal(result.max_usable_points, 250);
  assert.equal(result.points_used, 250);
});

test('payment method points restriction supports include and exclude modes', () => {
  assert.equal(orderPricing.isPaymentMethodAllowedForPoints({ payment_points_mode: 'all' }, 'whatsapp'), true);
  assert.equal(orderPricing.isPaymentMethodAllowedForPoints({ payment_points_mode: 'disabled' }, 'online'), false);
  assert.equal(orderPricing.isPaymentMethodAllowedForPoints({ payment_points_mode: 'include', allowed_payment_methods: ['online'] }, 'online'), true);
  assert.equal(orderPricing.isPaymentMethodAllowedForPoints({ payment_points_mode: 'include', allowed_payment_methods: ['online'] }, 'whatsapp'), false);
  assert.equal(orderPricing.isPaymentMethodAllowedForPoints({ payment_points_mode: 'exclude', allowed_payment_methods: ['whatsapp'] }, 'online'), true);
  assert.equal(orderPricing.isPaymentMethodAllowedForPoints({ payment_points_mode: 'exclude', allowed_payment_methods: ['whatsapp'] }, 'whatsapp'), false);
});

test('restricted products are excluded from redeem base', () => {
  const result = calculateMaxUsablePoints({
    settings: baseSettings,
    userPointsBalance: 5000,
    pointsToUse: 100,
    productMap: { p1: { id: 'p1', is_restricted: true } },
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100 }],
  });
  assert.equal(result.max_usable_points, 0);
  assert.equal(result.disabled_reason, '当前商品不支持积分抵扣');
});

test('restricted products do not earn points regardless of redeem scope', () => {
  const result = calculateOrderEarnedPoints({
    settings: { ...baseSettings, redeem_scope: 'all' },
    productMap: { p1: { id: 'p1', is_restricted: true } },
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100, line_paid_amount: 100 }],
  });
  assert.equal(result.earned_points, 0);
  assert.equal(result.item_results[0].reason, 'restricted_no_points');
});

test('earn_mode amount ignores product rules and uses global earn only', () => {
  const rules = [
    { id: 'prod', scope_type: 'product', scope_id: 'p1', earn_mode: 'fixed_per_item', fixed_points: 99, priority: 1, enabled: 1, earn_enabled: 1 },
  ];
  const result = calculateOrderEarnedPoints({
    settings: { ...baseSettings, earn_mode: 'amount' },
    productRules: rules,
    productMap: { p1: { id: 'p1' } },
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100, line_paid_amount: 100 }],
  });
  assert.equal(result.earned_points, 100);
});

test('earn_mode product_rule grants zero when no rule matches', () => {
  const result = calculateOrderEarnedPoints({
    settings: { ...baseSettings, earn_mode: 'product_rule' },
    productRules: [],
    productMap: { p1: { id: 'p1' } },
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100, line_paid_amount: 100 }],
  });
  assert.equal(result.earned_points, 0);
  assert.equal(result.item_results[0].reason, 'no_product_rule');
});

test('earn_after_discount off uses pre-discount subtotal for global earn', () => {
  const result = calculateOrderEarnedPoints({
    settings: { ...baseSettings, earn_after_discount: 0 },
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100, line_paid_amount: 60 }],
  });
  assert.equal(result.earned_points, 100);
  assert.equal(result.item_results[0].line_points_base_amount, 100);
});

test('member_price_no_points skips earn on lines with member discount share', () => {
  const result = calculateOrderEarnedPoints({
    settings: { ...baseSettings, member_price_no_points: 1 },
    orderItems: [
      { product_id: 'p1', qty: 1, price: 100, subtotal: 100, line_paid_amount: 90, member_discount_share: 10 },
      { product_id: 'p2', qty: 1, price: 50, subtotal: 50, line_paid_amount: 50, member_discount_share: 0 },
    ],
  });
  assert.equal(result.item_results[0].earned_points, 0);
  assert.equal(result.item_results[0].reason, 'member_price_no_points');
  assert.equal(result.item_results[1].earned_points, 50);
  assert.equal(result.earned_points, 50);
});

test('allow_with_reward_cash blocks redeem when reward cash is requested', () => {
  const result = calculateMaxUsablePoints({
    settings: { ...baseSettings, allow_with_reward_cash: 0 },
    userPointsBalance: 5000,
    useRewardCash: true,
    pointsToUse: 100,
    orderItems: [{ product_id: 'p1', qty: 1, price: 100, subtotal: 100 }],
  });
  assert.equal(result.max_usable_points, 0);
  assert.equal(result.disabled_reason, '返现余额不能与积分叠加');
});
