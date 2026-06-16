const { test } = require('node:test');
const assert = require('node:assert/strict');

const cartService = require('../src/modules/cart/service/cart.service');
const cartRepo = require('../src/modules/cart/repository/cart.repository');
const orderModule = require('../src/modules/order');

test('buildCartPreviewBody maps cart rows into checkout pricing items', () => {
  const body = cartService.buildCartPreviewBody([
    { id: 'p1', variant_id: 'v1', sku_code: 'SKU-1', qty: 2 },
    { id: 'p2', variant_id: '', sku_code: '', qty: 1 },
  ]);

  assert.deepEqual(body, {
    items: [
      { product_id: 'p1', variant_id: 'v1', sku_code: 'SKU-1', qty: 2 },
      { product_id: 'p2', variant_id: undefined, sku_code: undefined, qty: 1 },
    ],
    payment_method: 'online',
  });
});

test('getCartPreview returns promotion evaluation from pricing service', async () => {
  const originalDeleteUnavailable = cartRepo.deleteUnavailableCartItems;
  const originalSelectLines = cartRepo.selectCartLinesWithProducts;
  const originalPricing = orderModule.api.buildCheckoutPricing;

  try {
    cartRepo.deleteUnavailableCartItems = async (userId) => {
      assert.equal(userId, 'u1');
    };
    cartRepo.selectCartLinesWithProducts = async () => [{
      id: 'p1',
      name: '测试商品',
      cover_image: '',
      images: '[]',
      image_alt_json: '[]',
      price: 80,
      original_price: 100,
      points: 0,
      category_id: 'c1',
      stock: 10,
      lifecycle_status: 1,
      qty: 1,
      variant_id: '',
      sku_code: '',
    }];
    orderModule.api.buildCheckoutPricing = async (userId, body) => {
      assert.equal(userId, 'u1');
      assert.deepEqual(body.items, [{ product_id: 'p1', variant_id: undefined, sku_code: undefined, qty: 1 }]);
      return {
        rawAmount: 80,
        flashSaleDiscount: 20,
        fullReductionDiscount: 0,
        couponDiscount: 0,
        discountAmount: 20,
        shippingFee: 0,
        finalTotal: 80,
        discount_lines: [{ type: 'limited_time_discount', label: '限时折扣', amount: 20 }],
        promotion_evaluation: {
          engine_version: 'promotion_engine_v2_compat_2026_06',
          eligible: true,
          applied: [{ type: 'limited_time_discount' }],
          unavailable_reasons: [],
          discount_lines: [{ type: 'limited_time_discount', label: '限时折扣', amount: 20 }],
          reward_lines: [],
          matched_items: [],
          stacking_result: {},
          order_snapshot: {},
        },
      };
    };

    const result = await cartService.getCartPreview('u1');

    assert.equal(result.items.length, 1);
    assert.equal(result.promotion_engine_version, 'promotion_engine_v2_compat_2026_06');
    assert.equal(result.promotion_evaluation.applied[0].type, 'limited_time_discount');
    assert.equal(result.discount_lines[0].amount, 20);
  } finally {
    cartRepo.deleteUnavailableCartItems = originalDeleteUnavailable;
    cartRepo.selectCartLinesWithProducts = originalSelectLines;
    orderModule.api.buildCheckoutPricing = originalPricing;
  }
});
