const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const orderRepo = require('../repository/order.repository');
const siteSettingsRepo = require('../repository/siteSettings.repository');

function getOrderApi() {
  return /** @type {any} */ (require('../../order')).api || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireOrderApi(name) {
  const fn = getOrderApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Order module API method missing: ${name}`);
  }
  return fn;
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User module API method missing: ${name}`);
  }
  return fn;
}

let schedulerTimer = null;

function parseEnabled(raw, fallback = false) {
  if (raw == null || raw === '') return fallback;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function parseMinutes(raw, fallback = 30) {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 60 * 24 * 30);
}

async function loadPaymentTimeoutSettings() {
  const rows = await siteSettingsRepo.selectSiteSettingsByKeys([
    'orderPaymentTimeoutEnabled',
    'orderPaymentTimeoutMinutes',
  ]);
  const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  return {
    enabled: parseEnabled(
      map.orderPaymentTimeoutEnabled,
      parseEnabled(process.env.ORDER_PAYMENT_TIMEOUT_ENABLED, false),
    ),
    minutes: parseMinutes(
      map.orderPaymentTimeoutMinutes,
      parseMinutes(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES, 30),
    ),
  };
}

async function selectExpiredPendingOrderIds(minutes, limit = 80) {
  const pool = orderRepo.getPool();
  return orderRepo.selectExpiredPendingOrderIds(
    pool,
    minutes,
    limit,
    ORDER_STATUS.PENDING,
    PAYMENT_STATUS.PENDING,
  );
}

function isTimedOutByCreatedAt(order, minutes) {
  const createdAtMs = new Date(order.created_at).getTime();
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs >= minutes * 60 * 1000;
}

async function autoCancelOneOrder(orderId, minutes) {
  const conn = await orderRepo.getConnection();
  try {
    await conn.beginTransaction();
    const order = await orderRepo.selectOrderByIdForUpdate(conn, orderId);
    if (
      !order
      || order.status !== ORDER_STATUS.PENDING
      || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING
      || !isTimedOutByCreatedAt(order, minutes)
    ) {
      await conn.rollback();
      return false;
    }

    await requireOrderApi('cancelPendingOrderInTransaction')(conn, order, {
      trigger: 'auto_cancel_unpaid_order',
      cancelReason: `未支付超时自动取消（${minutes} 分钟）订单 ${order.order_no}`,
      stockReason: `未支付超时订单 ${order.order_no} 释放库存`,
      pointReason: `未支付超时订单积分回滚（${order.order_no}）`,
    });
    await requireUserApi('syncStatsAfterOrderCancelled')(order.user_id, order.id, conn);
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function runPaymentTimeoutTick() {
  const { enabled, minutes } = await loadPaymentTimeoutSettings();
  if (!enabled) return;
  const ids = await selectExpiredPendingOrderIds(minutes);
  let done = 0;
  for (const id of ids) {
    try {
      if (await autoCancelOneOrder(id, minutes)) done += 1;
    } catch (err) {
      console.error('[orderPaymentTimeout] order', id, err?.message || err);
    }
  }
  if (done > 0) console.log(`[orderPaymentTimeout] auto-cancelled ${done} unpaid order(s)`);
}

function startPaymentTimeoutScheduler() {
  if (schedulerTimer) return;
  const intervalMs = Number(process.env.ORDER_PAYMENT_TIMEOUT_INTERVAL_MS) || 5 * 60 * 1000;
  schedulerTimer = setInterval(() => {
    runPaymentTimeoutTick().catch((err) => {
      console.error('[orderPaymentTimeout] tick failed:', err?.message || err);
    });
  }, intervalMs);
  setTimeout(() => {
    runPaymentTimeoutTick().catch((err) => {
      console.error('[orderPaymentTimeout] initial tick failed:', err?.message || err);
    });
  }, 20_000);
}

module.exports = {
  loadPaymentTimeoutSettings,
  runPaymentTimeoutTick,
  startPaymentTimeoutScheduler,
  autoCancelOneOrder,
};



