const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertUnifiedPricingMatchesCatalog,
  buildOrderLineItems,
  __test,
} = require('../src/modules/order/service/orderCreate.service');
const { allocateOrderProfitSnapshot } = require('../src/modules/order/service/orderCreate.helpers');
const repo = require('../src/modules/order/repository/order.repository');
const siteSettingsRepo = require('../src/modules/order/repository/siteSettings.repository');

test('buildOrderLineItems sums line subtotals', () => {
  const productMap = {
    p1: { id: 'p1', name: 'Apple', price: 10, cover_image: '', points: 0 },
  };
  const variant = { id: 'v1', product_id: 'p1', price: 12, sku_code: 'SKU1', title: 'Large' };
  const result = buildOrderLineItems(
    [{ product_id: 'p1', variant_id: 'v1', qty: 2 }],
    {
      productMap,
      variantById: new Map([['v1', variant]]),
      defaultVariantByProductId: new Map(),
      specMap: new Map([['v1', []]]),
      activityMap: new Map(),
    },
  );
  assert.equal(result.rawAmount, 24);
  assert.equal(result.orderItems.length, 1);
  assert.equal(result.orderItems[0].price, 12);
});

test('allocateOrderProfitSnapshot allocates discount to lines', () => {
  const snapshot = allocateOrderProfitSnapshot(
    [{ price: 100, qty: 1, unitCostPrice: 40 }],
    {
      rawAmount: 100,
      discountAmount: 10,
      pointsDiscountAmount: 0,
      rewardCashDiscountAmount: 0,
      shippingFee: 5,
    },
  );
  assert.equal(snapshot.items[0].discountAllocated, 10);
  assert.equal(snapshot.summary.netProfitAmount, 55);
});

test('assertUnifiedPricingMatchesCatalog accepts matching pricing snapshot', () => {
  assert.doesNotThrow(() => assertUnifiedPricingMatchesCatalog(
    {
      rawAmount: 24,
      orderItems: [{ productId: 'p1', variantId: 'v1', qty: 2 }],
    },
    {
      rawAmount: 24,
      orderItems: [{ productId: 'p1', variantId: 'v1', qty: 2 }],
    },
  ));
});

test('assertUnifiedPricingMatchesCatalog rejects drifted pricing amount', () => {
  assert.throws(
    () => assertUnifiedPricingMatchesCatalog(
      {
        rawAmount: 25,
        orderItems: [{ productId: 'p1', variantId: 'v1', qty: 2 }],
      },
      {
        rawAmount: 24,
        orderItems: [{ productId: 'p1', variantId: 'v1', qty: 2 }],
      },
    ),
    /商品金额已变化/,
  );
});

test('assertUnifiedPricingMatchesCatalog rejects drifted item quantity', () => {
  assert.throws(
    () => assertUnifiedPricingMatchesCatalog(
      {
        rawAmount: 24,
        orderItems: [{ productId: 'p1', variantId: 'v1', qty: 1 }],
      },
      {
        rawAmount: 24,
        orderItems: [{ productId: 'p1', variantId: 'v1', qty: 2 }],
      },
    ),
    /商品数量已变化/,
  );
});

test('order idempotency payload hash ignores idempotency key and sorts object keys', () => {
  const base = {
    idempotency_key: 'checkout-key-1',
    payment_method: 'online',
    address: { state: 'Selangor', city: 'Klang' },
    items: [{ qty: 2, variant_id: 'v1', product_id: 'p1' }],
  };
  const reordered = {
    items: [{ product_id: 'p1', variant_id: 'v1', qty: 2 }],
    address: { city: 'Klang', state: 'Selangor' },
    payment_method: 'online',
    idempotency_key: 'checkout-key-2',
  };
  const changed = {
    ...base,
    items: [{ qty: 3, variant_id: 'v1', product_id: 'p1' }],
  };

  assert.equal(__test.normalizeIdempotencyKey('  short  '), '');
  assert.equal(__test.normalizeIdempotencyKey(` ${'x'.repeat(140)} `).length, 128);
  assert.equal(__test.buildOrderPayloadHash(base), __test.buildOrderPayloadHash(reordered));
  assert.notEqual(__test.buildOrderPayloadHash(base), __test.buildOrderPayloadHash(changed));
});

test('resolveOrderIdempotency returns existing order for completed same payload', async () => {
  const body = {
    idempotency_key: 'checkout-key-1',
    payment_method: 'online',
    items: [{ product_id: 'p1', variant_id: 'v1', qty: 1 }],
  };
  const payloadHash = __test.buildOrderPayloadHash(body);
  const original = {
    insertOrderIdempotencyKey: repo.insertOrderIdempotencyKey,
    selectOrderIdempotencyForUpdate: repo.selectOrderIdempotencyForUpdate,
    selectOrderById: repo.selectOrderById,
    selectOrderItems: repo.selectOrderItems,
    selectSiteSettingsByKeys: siteSettingsRepo.selectSiteSettingsByKeys,
  };
  try {
    repo.insertOrderIdempotencyKey = async () => false;
    repo.selectOrderIdempotencyForUpdate = async (_conn, userId, key) => {
      assert.equal(userId, 'user-1');
      assert.equal(key, 'checkout-key-1');
      return {
        payload_hash: payloadHash,
        status: 'completed',
        order_id: 'order-1',
      };
    };
    repo.selectOrderById = async (_conn, orderId) => ({
      id: orderId,
      order_no: 'NO-001',
      raw_amount: 12,
      discount_amount: 0,
      shipping_fee: 0,
      total_amount: 12,
      total_points: 0,
      status: 'pending',
      payment_status: 'pending',
      contact_name: 'Test',
      contact_phone: '+60123456789',
      address: 'Klang',
      created_at: new Date().toISOString(),
    });
    repo.selectOrderItems = async () => [{
      id: 'item-1',
      product_id: 'p1',
      variant_id: 'v1',
      product_name_snapshot: 'Item',
      product_image_snapshot: '',
      price: 12,
      qty: 1,
      subtotal: 12,
    }];
    siteSettingsRepo.selectSiteSettingsByKeys = async () => [];

    const result = await __test.resolveOrderIdempotency({}, 'user-1', body);

    assert.equal(result.idempotencyKey, 'checkout-key-1');
    assert.equal(result.existingOrder.id, 'order-1');
    assert.equal(result.existingOrder.items.length, 1);
  } finally {
    repo.insertOrderIdempotencyKey = original.insertOrderIdempotencyKey;
    repo.selectOrderIdempotencyForUpdate = original.selectOrderIdempotencyForUpdate;
    repo.selectOrderById = original.selectOrderById;
    repo.selectOrderItems = original.selectOrderItems;
    siteSettingsRepo.selectSiteSettingsByKeys = original.selectSiteSettingsByKeys;
  }
});

test('resolveOrderIdempotency rejects reused key with different payload', async () => {
  const body = { idempotency_key: 'checkout-key-1', items: [{ product_id: 'p1', qty: 1 }] };
  const original = {
    insertOrderIdempotencyKey: repo.insertOrderIdempotencyKey,
    selectOrderIdempotencyForUpdate: repo.selectOrderIdempotencyForUpdate,
    selectOrderById: repo.selectOrderById,
  };
  try {
    repo.insertOrderIdempotencyKey = async () => false;
    repo.selectOrderIdempotencyForUpdate = async () => ({
      payload_hash: __test.buildOrderPayloadHash({ idempotency_key: 'checkout-key-1', items: [{ product_id: 'p2', qty: 1 }] }),
      status: 'completed',
      order_id: 'order-1',
    });
    repo.selectOrderById = async () => {
      throw new Error('mismatched idempotency payload must not load existing order');
    };

    await assert.rejects(
      () => __test.resolveOrderIdempotency({}, 'user-1', body),
      /重复提交标识已用于另一笔订单/,
    );
  } finally {
    repo.insertOrderIdempotencyKey = original.insertOrderIdempotencyKey;
    repo.selectOrderIdempotencyForUpdate = original.selectOrderIdempotencyForUpdate;
    repo.selectOrderById = original.selectOrderById;
  }
});

test('resolveOrderIdempotency rejects processing or failed previous attempt', async () => {
  const body = { idempotency_key: 'checkout-key-1', items: [{ product_id: 'p1', qty: 1 }] };
  const payloadHash = __test.buildOrderPayloadHash(body);
  const original = {
    insertOrderIdempotencyKey: repo.insertOrderIdempotencyKey,
    selectOrderIdempotencyForUpdate: repo.selectOrderIdempotencyForUpdate,
  };
  try {
    repo.insertOrderIdempotencyKey = async () => false;
    repo.selectOrderIdempotencyForUpdate = async () => ({
      payload_hash: payloadHash,
      status: 'processing',
      order_id: null,
    });
    await assert.rejects(
      () => __test.resolveOrderIdempotency({}, 'user-1', body),
      /订单正在处理中/,
    );

    repo.selectOrderIdempotencyForUpdate = async () => ({
      payload_hash: payloadHash,
      status: 'failed',
      error_message: '库存不足',
      order_id: null,
    });
    await assert.rejects(
      () => __test.resolveOrderIdempotency({}, 'user-1', body),
      /库存不足/,
    );
  } finally {
    repo.insertOrderIdempotencyKey = original.insertOrderIdempotencyKey;
    repo.selectOrderIdempotencyForUpdate = original.selectOrderIdempotencyForUpdate;
  }
});
