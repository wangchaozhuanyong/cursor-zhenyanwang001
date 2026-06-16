const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const inventoryLock = require('../src/modules/order/service/inventoryLock.service');
const repo = require('../src/modules/order/repository/order.repository');
const siteCapabilities = require('../src/modules/siteCapabilities');

const original = {
  isCapabilityEnabled: siteCapabilities.api.isCapabilityEnabled,
  incrementActivitySold: repo.incrementActivitySold,
  decrementActivitySold: repo.decrementActivitySold,
  deductVariantStock: repo.deductVariantStock,
  reserveVariantStock: repo.reserveVariantStock,
  orderHasReservedInventoryLock: repo.orderHasReservedInventoryLock,
  restoreVariantStock: repo.restoreVariantStock,
  releaseReservedVariantStock: repo.releaseReservedVariantStock,
  selectOrderItemQtyRows: repo.selectOrderItemQtyRows,
  confirmReservedVariantStock: repo.confirmReservedVariantStock,
};

afterEach(() => {
  siteCapabilities.api.isCapabilityEnabled = original.isCapabilityEnabled;
  repo.incrementActivitySold = original.incrementActivitySold;
  repo.decrementActivitySold = original.decrementActivitySold;
  repo.deductVariantStock = original.deductVariantStock;
  repo.reserveVariantStock = original.reserveVariantStock;
  repo.orderHasReservedInventoryLock = original.orderHasReservedInventoryLock;
  repo.restoreVariantStock = original.restoreVariantStock;
  repo.releaseReservedVariantStock = original.releaseReservedVariantStock;
  repo.selectOrderItemQtyRows = original.selectOrderItemQtyRows;
  repo.confirmReservedVariantStock = original.confirmReservedVariantStock;
});

describe('inventory lock v2 service', () => {
  test('keeps legacy immediate stock deduction while inventoryLockV2 is disabled', async () => {
    const calls = [];
    siteCapabilities.api.isCapabilityEnabled = async () => false;
    repo.incrementActivitySold = async () => 1;
    repo.deductVariantStock = async (_conn, variantId, qty, meta) => {
      calls.push({ fn: 'deductVariantStock', variantId, qty, reason: meta.reason });
      return 1;
    };
    repo.reserveVariantStock = async () => {
      throw new Error('reserve should not be called');
    };

    const result = await inventoryLock.lockOrderInventory({}, {
      orderId: 'order_1',
      orderNo: 'ORD-001',
      lines: [{ productId: 'product_1', variantId: 'variant_1', qty: 2 }],
    });

    assert.equal(result.ok, true);
    assert.equal(result.version, inventoryLock.INVENTORY_LOCK_VERSION);
    assert.deepEqual(result.movements.map((item) => item.type), ['sku_stock_deduct']);
    assert.equal(calls[0].fn, 'deductVariantStock');
  });

  test('reserves stock instead of deducting stock while inventoryLockV2 is enabled', async () => {
    const calls = [];
    siteCapabilities.api.isCapabilityEnabled = async (key) => key === 'inventoryLockV2';
    repo.incrementActivitySold = async () => 1;
    repo.reserveVariantStock = async (_conn, variantId, qty, meta) => {
      calls.push({ fn: 'reserveVariantStock', variantId, qty, reason: meta.reason });
      return 1;
    };
    repo.deductVariantStock = async () => {
      throw new Error('deduct should not be called');
    };

    const result = await inventoryLock.lockOrderInventory({}, {
      orderId: 'order_1',
      orderNo: 'ORD-001',
      lines: [{ productId: 'product_1', variantId: 'variant_1', qty: 2 }],
    });

    assert.equal(result.ok, true);
    assert.equal(result.version, inventoryLock.INVENTORY_LOCK_V2_VERSION);
    assert.deepEqual(result.movements.map((item) => item.type), ['sku_stock_lock']);
    assert.equal(calls[0].fn, 'reserveVariantStock');
  });

  test('releases reserved stock for v2 orders and restores stock for legacy orders', async () => {
    const calls = [];
    repo.orderHasReservedInventoryLock = async (_conn, orderId) => orderId === 'v2_order';
    repo.releaseReservedVariantStock = async (_conn, variantId, qty, meta) => {
      calls.push({ fn: 'releaseReservedVariantStock', variantId, qty, operatorId: meta.operatorId });
      return 1;
    };
    repo.restoreVariantStock = async (_conn, variantId, qty, meta) => {
      calls.push({ fn: 'restoreVariantStock', variantId, qty, operatorId: meta.operatorId });
      return 1;
    };
    repo.decrementActivitySold = async (_conn, activityId, productId, qty) => {
      calls.push({ fn: 'decrementActivitySold', activityId, productId, qty });
      return 1;
    };

    const v2 = await inventoryLock.releaseOrderInventory({}, {
      orderId: 'v2_order',
      orderNo: 'ORD-V2',
      items: [{ product_id: 'product_1', variant_id: 'variant_1', qty: 1, activity_id: 'activity_1' }],
      operatorId: 'admin-1',
    });
    const legacy = await inventoryLock.releaseOrderInventory({}, {
      orderId: 'legacy_order',
      orderNo: 'ORD-LEGACY',
      items: [{ variant_id: 'variant_2', qty: 3 }],
    });

    assert.equal(v2.ok, true);
    assert.equal(v2.version, inventoryLock.INVENTORY_LOCK_V2_VERSION);
    assert.equal(legacy.ok, true);
    assert.equal(legacy.version, inventoryLock.INVENTORY_LOCK_VERSION);
    assert.deepEqual(calls.map((item) => item.fn), ['releaseReservedVariantStock', 'decrementActivitySold', 'restoreVariantStock']);
    assert.equal(calls[0].operatorId, 'admin-1');
    assert.deepEqual(v2.movements.map((item) => item.type), ['sku_stock_lock_release', 'activity_sold_release']);
  });

  test('restores real stock and activity sold count after refund', async () => {
    const calls = [];
    repo.restoreVariantStock = async (_conn, variantId, qty, meta) => {
      calls.push({ fn: 'restoreVariantStock', variantId, qty, reason: meta.reason });
      return 1;
    };
    repo.decrementActivitySold = async (_conn, activityId, productId, qty) => {
      calls.push({ fn: 'decrementActivitySold', activityId, productId, qty });
      return 1;
    };

    const result = await inventoryLock.restoreOrderInventoryAfterRefund({}, {
      orderId: 'paid_order',
      orderNo: 'ORD-PAID',
      reason: '全额退款恢复库存',
      items: [{ product_id: 'product_1', variant_id: 'variant_1', qty: 2, activity_id: 'activity_1' }],
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.movements.map((item) => item.type), ['sku_stock_restore', 'activity_sold_release']);
    assert.deepEqual(calls.map((item) => item.fn), ['restoreVariantStock', 'decrementActivitySold']);
  });

  test('confirms reserved stock on payment success only for v2 locked orders', async () => {
    const calls = [];
    repo.orderHasReservedInventoryLock = async (_conn, orderId) => orderId === 'v2_order';
    repo.selectOrderItemQtyRows = async () => [{ variant_id: 'variant_1', qty: 2 }];
    repo.confirmReservedVariantStock = async (_conn, variantId, qty) => {
      calls.push({ variantId, qty });
      return 1;
    };

    const skipped = await inventoryLock.confirmOrderInventoryIfLocked({}, {
      orderId: 'legacy_order',
      orderNo: 'ORD-LEGACY',
    });
    const confirmed = await inventoryLock.confirmOrderInventoryIfLocked({}, {
      orderId: 'v2_order',
      orderNo: 'ORD-V2',
    });

    assert.equal(skipped.ok, true);
    assert.equal(skipped.skipped, true);
    assert.equal(confirmed.ok, true);
    assert.equal(confirmed.version, inventoryLock.INVENTORY_LOCK_V2_VERSION);
    assert.deepEqual(calls, [{ variantId: 'variant_1', qty: 2 }]);
  });
});
