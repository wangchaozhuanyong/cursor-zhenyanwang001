const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/modules/marketing/service/promotionRuleEngine.service');

test('promotion engine reports full reduction shortfall', () => {
  const result = engine.evaluatePricingResult({
    body: { items: [{ product_id: 'p1', qty: 1 }] },
    pricing: {
      rawAmount: 80,
      finalTotal: 80,
      orderItems: [{ productId: 'p1', price: 80, qty: 1 }],
      productMap: { p1: { category_id: 'c1' } },
      fullReductionActivities: [{
        activity_id: 'fr-1',
        title: '满100减10',
        type: 'full_reduction',
        threshold_amount: 100,
        discount_amount: 10,
        scope_type: 'all',
        scopes: [],
      }],
      flashByProductId: new Map(),
      discount_lines: [],
      loyalty: { earned_points: 8 },
    },
  });

  assert.equal(result.engine_version, engine.PROMOTION_ENGINE_VERSION);
  assert.equal(result.unavailable_reasons.length, 1);
  assert.equal(result.unavailable_reasons[0].shortfall_amount, 20);
  assert.equal(result.reward_lines.some((line) => line.source_type === 'earned_points'), true);
});

test('promotion engine reports applied full reduction and matched items', () => {
  const result = engine.evaluatePricingResult({
    body: { items: [{ product_id: 'p1', qty: 1 }] },
    pricing: {
      rawAmount: 120,
      fullReductionDiscount: 10,
      activityDiscountAmount: 10,
      finalTotal: 110,
      orderItems: [{ productId: 'p1', price: 120, qty: 1 }],
      productMap: { p1: { category_id: 'c1' } },
      fullReductionActivities: [{
        activity_id: 'fr-1',
        title: '满100减10',
        type: 'full_reduction',
        threshold_amount: 100,
        discount_amount: 10,
        scope_type: 'all',
        scopes: [],
      }],
      flashByProductId: new Map(),
      discount_lines: [{ type: 'full_reduction', label: '满减优惠', amount: 10 }],
    },
  });

  const appliedFullReduction = result.applied.find((item) => item.type === 'full_reduction');
  assert.equal(appliedFullReduction.discount_amount, 10);
  assert.equal(result.matched_items.some((item) => item.type === 'full_reduction' && item.product_id === 'p1'), true);
});

test('promotion engine reports applied full discount and matched items', () => {
  const result = engine.evaluatePricingResult({
    body: { items: [{ product_id: 'p1', qty: 1 }] },
    pricing: {
      rawAmount: 120,
      fullReductionDiscount: 12,
      activityDiscountAmount: 12,
      finalTotal: 108,
      orderItems: [{ productId: 'p1', price: 120, qty: 1 }],
      productMap: { p1: { category_id: 'c1' } },
      fullReductionActivities: [{
        activity_id: 'fd-1',
        title: '满100打9折',
        type: 'full_discount',
        scope_type: 'all',
        scopes: [],
        activity_config: { full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }] },
      }],
      flashByProductId: new Map(),
      discount_lines: [{ type: 'full_discount', label: '满折优惠', amount: 12 }],
    },
  });

  const appliedFullDiscount = result.applied.find((item) => item.type === 'full_discount');
  assert.equal(appliedFullDiscount.discount_amount, 12);
  assert.equal(appliedFullDiscount.discount_percent, 90);
  assert.equal(result.matched_items.some((item) => item.type === 'full_discount' && item.product_id === 'p1'), true);
});

test('promotion engine reports flash sale savings and stacking result', () => {
  const result = engine.evaluatePricingResult({
    body: { items: [{ product_id: 'p1', qty: 2 }] },
    pricing: {
      rawAmount: 160,
      flashSaleDiscount: 40,
      activityDiscountAmount: 40,
      finalTotal: 160,
      orderItems: [{
        productId: 'p1',
        variantId: 'v1',
        price: 80,
        basePrice: 100,
        qty: 2,
        activityId: 'flash-1',
        activityTitle: '限时秒杀',
        activityType: 'flash_sale',
      }],
      productMap: { p1: { price: 100, category_id: 'c1' } },
      fullReductionActivities: [],
      flashByProductId: new Map([['p1', {
        activity_id: 'flash-1',
        title: '限时秒杀',
        activity_price: 80,
        activity_stock: 10,
        sold_count: 3,
        limit_per_user: 2,
        allow_coupon_stack: 0,
        allow_points_stack: 1,
        allow_reward: 1,
      }]]),
      discount_lines: [{ type: 'flash_sale', label: '秒杀优惠', amount: 40 }],
    },
  });

  const appliedFlash = result.applied.find((item) => item.type === 'flash_sale');
  assert.equal(appliedFlash.discount_amount, 40);
  assert.equal(result.matched_items[0].remaining_stock, 7);
  assert.equal(result.stacking_result.coupon_stack_allowed, false);
  assert.equal(result.stacking_result.points_stack_allowed, true);
});

test('promotion engine preserves limited time discount type', () => {
  const result = engine.evaluatePricingResult({
    body: { items: [{ product_id: 'p1', qty: 1 }] },
    pricing: {
      rawAmount: 90,
      flashSaleDiscount: 10,
      activityDiscountAmount: 10,
      finalTotal: 90,
      orderItems: [{
        productId: 'p1',
        price: 90,
        basePrice: 100,
        qty: 1,
        activityId: 'limited-1',
        activityTitle: '今晚限时折扣',
        activityType: 'limited_time_discount',
      }],
      productMap: { p1: { price: 100 } },
      fullReductionActivities: [],
      flashByProductId: new Map([['p1', {
        activity_id: 'limited-1',
        type: 'limited_time_discount',
        title: '今晚限时折扣',
        activity_price: 90,
      }]]),
      discount_lines: [{ type: 'flash_sale', label: '活动价优惠', amount: 10 }],
    },
  });

  assert.equal(result.applied.some((item) => item.type === 'limited_time_discount'), true);
  assert.equal(result.matched_items.some((item) => item.type === 'limited_time_discount'), true);
});

test('promotion engine blocks activity when usage limit is reached', () => {
  const result = engine.evaluatePricingResult({
    userId: 'u1',
    body: { items: [{ product_id: 'p1', qty: 1 }] },
    pricing: {
      rawAmount: 90,
      flashSaleDiscount: 10,
      activityDiscountAmount: 10,
      finalTotal: 90,
      orderItems: [{
        productId: 'p1',
        price: 90,
        basePrice: 100,
        qty: 1,
        activityId: 'limited-1',
        activityTitle: '今晚限时折扣',
        activityType: 'limited_time_discount',
      }],
      productMap: { p1: { price: 100 } },
      fullReductionActivities: [],
      flashByProductId: new Map([['p1', {
        activity_id: 'limited-1',
        type: 'limited_time_discount',
        title: '今晚限时折扣',
        activity_price: 90,
        usage_limit_total: 1,
      }]]),
      promotion_usage: {
        byPromotionId: {
          'limited-1': { total_count: 1, user_count: 0 },
        },
      },
      discount_lines: [{ type: 'flash_sale', label: '活动价优惠', amount: 10 }],
    },
  });

  assert.equal(result.eligible, false);
  assert.equal(result.applied.some((item) => item.promotion_id === 'limited-1'), false);
  assert.equal(result.unavailable_reasons[0].blocking, true);
  assert.equal(result.unavailable_reasons[0].limit_type, 'total');
});

test('promotion engine preserves member price promotion id and stacking metadata', () => {
  const result = engine.evaluatePricingResult({
    userId: 'u1',
    body: { items: [{ product_id: 'p1', qty: 1 }] },
    pricing: {
      rawAmount: 100,
      memberActivityDiscount: 5,
      activityDiscountAmount: 5,
      finalTotal: 95,
      orderItems: [{ productId: 'p1', price: 100, qty: 1 }],
      productMap: { p1: { price: 100 } },
      flashByProductId: new Map(),
      fullReductionActivities: [],
      memberPriceActivities: [{
        activity_id: 'mp-1',
        title: 'VIP 会员价',
        type: 'member_price',
        stackable: 1,
        exclusive_with: ['coupon'],
        version: 2,
      }],
      discount_lines: [{
        type: 'member_price',
        promotion_id: 'mp-1',
        activity_id: 'mp-1',
        label: '会员价：VIP 会员价',
        amount: 5,
      }],
    },
  });

  const appliedMemberPrice = result.applied.find((item) => item.type === 'member_price');
  assert.equal(appliedMemberPrice.promotion_id, 'mp-1');
  assert.equal(appliedMemberPrice.discount_amount, 5);
  assert.deepEqual(appliedMemberPrice.exclusive_with, ['coupon']);
  assert.equal(result.stacking_result.exclusive_with.includes('coupon'), true);
});

test('promotion engine blocks member price when usage limit is reached', () => {
  const result = engine.evaluatePricingResult({
    userId: 'u1',
    body: { items: [{ product_id: 'p1', qty: 1 }] },
    pricing: {
      rawAmount: 100,
      memberActivityDiscount: 5,
      activityDiscountAmount: 5,
      finalTotal: 95,
      orderItems: [{ productId: 'p1', price: 100, qty: 1 }],
      productMap: { p1: { price: 100 } },
      flashByProductId: new Map(),
      fullReductionActivities: [],
      memberPriceActivities: [{
        activity_id: 'mp-1',
        title: 'VIP 会员价',
        type: 'member_price',
        usage_limit_per_user: 1,
      }],
      promotion_usage: {
        byPromotionId: {
          'mp-1': { total_count: 0, user_count: 1 },
        },
      },
      discount_lines: [{
        type: 'member_price',
        promotion_id: 'mp-1',
        activity_id: 'mp-1',
        label: '会员价：VIP 会员价',
        amount: 5,
      }],
    },
  });

  assert.equal(result.eligible, false);
  assert.equal(result.applied.some((item) => item.promotion_id === 'mp-1'), false);
  assert.equal(result.unavailable_reasons[0].limit_type, 'per_user');
});

test('promotion engine blocks mutually exclusive activity stack', () => {
  const result = engine.evaluatePricingResult({
    body: { items: [{ product_id: 'p1', qty: 1 }] },
    pricing: {
      rawAmount: 120,
      flashSaleDiscount: 20,
      fullReductionDiscount: 10,
      activityDiscountAmount: 30,
      finalTotal: 90,
      orderItems: [{
        productId: 'p1',
        price: 100,
        basePrice: 120,
        qty: 1,
        activityId: 'flash-1',
        activityTitle: '限时秒杀',
        activityType: 'flash_sale',
      }],
      productMap: { p1: { price: 120, category_id: 'c1' } },
      flashByProductId: new Map([['p1', {
        activity_id: 'flash-1',
        type: 'flash_sale',
        title: '限时秒杀',
        activity_price: 100,
        stackable: 1,
        exclusive_with: ['full_reduction'],
      }]]),
      fullReductionActivities: [{
        activity_id: 'fr-1',
        title: '满100减10',
        type: 'full_reduction',
        threshold_amount: 100,
        discount_amount: 10,
        scope_type: 'all',
        scopes: [],
        stackable: 1,
      }],
      discount_lines: [
        { type: 'flash_sale', label: '秒杀优惠', amount: 20 },
        { type: 'full_reduction', label: '满减优惠', amount: 10 },
      ],
    },
  });

  assert.equal(result.eligible, false);
  assert.equal(result.stacking_result.conflicts.length, 1);
  assert.equal(result.stacking_result.conflicts[0].conflict_type, 'full_reduction');
});
