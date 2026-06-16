const repo = require('../repository/order.repository');

const INVENTORY_LOCK_VERSION = 'inventory_lock_v2_compat_2026_06';
const INVENTORY_LOCK_V2_VERSION = 'inventory_lock_v2_reserved_stock_2026_06';

function getSiteCapabilitiesApi() {
  return /** @type {any} */ (require('../../siteCapabilities/publicApi')) || {};
}

async function isInventoryLockV2Enabled() {
  try {
    return await getSiteCapabilitiesApi().isCapabilityEnabled('inventoryLockV2');
  } catch {
    return false;
  }
}

async function lockOrderInventory(conn, { orderId, orderNo, lines }) {
  const useReservedStock = await isInventoryLockV2Enabled();
  const version = useReservedStock ? INVENTORY_LOCK_V2_VERSION : INVENTORY_LOCK_VERSION;
  const movements = [];
  for (const line of lines || []) {
    if (line.activityId) {
      const affected = await repo.incrementActivitySold(conn, line.activityId, line.productId, line.qty);
      if (!affected) {
        return {
          ok: false,
          version,
          reason: 'activity_stock_insufficient',
          line,
          movements,
        };
      }
      movements.push({
        type: 'activity_sold',
        activity_id: line.activityId,
        product_id: line.productId,
        qty: line.qty,
      });
    }

    if (!line.variantId) {
      return {
        ok: false,
        version,
        reason: 'missing_variant',
        line,
        movements,
      };
    }

    const stockMeta = {
      refType: 'order',
      refId: orderId,
      orderNo,
      reason: line.activityId
        ? `订单 ${orderNo} 活动「${line.activityTitle || line.activityId}」${useReservedStock ? '锁定' : '下单扣减'} SKU 库存`
        : `订单 ${orderNo} ${useReservedStock ? '锁定' : '下单扣减'} SKU 库存`,
    };
    const affected = useReservedStock
      ? await repo.reserveVariantStock(conn, line.variantId, line.qty, stockMeta)
      : await repo.deductVariantStock(conn, line.variantId, line.qty, stockMeta);
    if (!affected) {
      return {
        ok: false,
        version,
        reason: 'sku_stock_insufficient',
        line,
        movements,
      };
    }
    movements.push({
      type: useReservedStock ? 'sku_stock_lock' : 'sku_stock_deduct',
      variant_id: line.variantId,
      qty: line.qty,
    });
  }

  return {
    ok: true,
    version,
    movements,
  };
}

async function releaseOrderInventory(conn, {
  orderId,
  orderNo,
  items,
  reason,
  operatorId = null,
}) {
  const hasReservedLock = await repo.orderHasReservedInventoryLock(conn, orderId);
  const version = hasReservedLock ? INVENTORY_LOCK_V2_VERSION : INVENTORY_LOCK_VERSION;
  const movements = [];
  for (const item of items || []) {
    if (!item.variant_id) {
      return {
        ok: false,
        version,
        reason: 'missing_variant',
        line: item,
        movements,
      };
    }
    const meta = {
      refType: 'order',
      refId: orderId,
      orderNo,
      operatorId,
      reason: reason || (hasReservedLock ? `订单 ${orderNo} 取消释放预留库存` : `订单 ${orderNo} 取消释放库存`),
    };
    const affected = hasReservedLock
      ? await repo.releaseReservedVariantStock(conn, item.variant_id, item.qty, meta)
      : await repo.restoreVariantStock(conn, item.variant_id, item.qty, meta);
    if (!affected) {
      return {
        ok: false,
        version,
        reason: 'sku_stock_release_failed',
        line: item,
        movements,
      };
    }
    movements.push({
      type: hasReservedLock ? 'sku_stock_lock_release' : 'sku_stock_restore',
      variant_id: item.variant_id,
      qty: item.qty,
    });
    if (item.activity_id) {
      const affected = await repo.decrementActivitySold(conn, item.activity_id, item.product_id, item.qty);
      movements.push({
        type: 'activity_sold_release',
        activity_id: item.activity_id,
        product_id: item.product_id,
        qty: item.qty,
        affected,
      });
    }
  }
  return {
    ok: true,
    version,
    skipped: !hasReservedLock,
    movements,
  };
}

async function restoreOrderInventoryAfterRefund(conn, {
  orderId,
  orderNo,
  items,
  reason,
  operatorId = null,
}) {
  const movements = [];
  for (const item of items || []) {
    if (!item.variant_id) {
      return {
        ok: false,
        version: INVENTORY_LOCK_VERSION,
        reason: 'missing_variant',
        line: item,
        movements,
      };
    }
    const affected = await repo.restoreVariantStock(conn, item.variant_id, item.qty, {
      refType: 'order',
      refId: orderId,
      orderNo,
      operatorId,
      reason: reason || `订单退款恢复库存 ${orderNo}`,
    });
    if (!affected) {
      return {
        ok: false,
        version: INVENTORY_LOCK_VERSION,
        reason: 'sku_stock_restore_failed',
        line: item,
        movements,
      };
    }
    movements.push({
      type: 'sku_stock_restore',
      variant_id: item.variant_id,
      qty: item.qty,
    });
    if (item.activity_id) {
      const activityAffected = await repo.decrementActivitySold(conn, item.activity_id, item.product_id, item.qty);
      movements.push({
        type: 'activity_sold_release',
        activity_id: item.activity_id,
        product_id: item.product_id,
        qty: item.qty,
        affected: activityAffected,
      });
    }
  }
  return {
    ok: true,
    version: INVENTORY_LOCK_VERSION,
    movements,
  };
}

async function confirmOrderInventoryIfLocked(conn, { orderId, orderNo }) {
  const hasReservedLock = await repo.orderHasReservedInventoryLock(conn, orderId);
  if (!hasReservedLock) {
    return {
      ok: true,
      version: INVENTORY_LOCK_VERSION,
      skipped: true,
      movements: [],
    };
  }

  const movements = [];
  const items = await repo.selectOrderItemQtyRows(conn, orderId);
  for (const item of items || []) {
    if (!item.variant_id) {
      return {
        ok: false,
        version: INVENTORY_LOCK_V2_VERSION,
        reason: 'missing_variant',
        line: item,
        movements,
      };
    }
    const affected = await repo.confirmReservedVariantStock(conn, item.variant_id, item.qty, {
      refType: 'order',
      refId: orderId,
      orderNo,
      reason: `订单 ${orderNo} 支付成功确认扣减预留库存`,
    });
    if (!affected) {
      return {
        ok: false,
        version: INVENTORY_LOCK_V2_VERSION,
        reason: 'sku_stock_confirm_failed',
        line: item,
        movements,
      };
    }
    movements.push({
      type: 'sku_stock_lock_confirm',
      variant_id: item.variant_id,
      qty: item.qty,
    });
  }

  return {
    ok: true,
    version: INVENTORY_LOCK_V2_VERSION,
    movements,
  };
}

module.exports = {
  INVENTORY_LOCK_VERSION,
  INVENTORY_LOCK_V2_VERSION,
  confirmOrderInventoryIfLocked,
  lockOrderInventory,
  releaseOrderInventory,
  restoreOrderInventoryAfterRefund,
};
