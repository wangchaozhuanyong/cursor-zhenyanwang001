/**
 * 站点设置「发货后 N 天自动确认收货」：定时扫描已发货订单并置为已完成（结算积分/返现）。
 */
const { ORDER_STATUS } = require('../../constants/status');
const orderRepo = require('./order.repository');
const siteSettingsRepo = require('./siteSettings.repository');
const { completeShippedOrder } = require('./order.service');

let schedulerTimer = null;

function parseEnabled(raw) {
  if (raw == null || raw === '') return false;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function parseDays(raw) {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return 7;
  return Math.min(n, 365);
}

async function loadAutoConfirmSettings() {
  const rows = await siteSettingsRepo.selectSiteSettingsByKeys([
    'autoConfirmReceiveEnabled',
    'autoConfirmReceiveDays',
  ]);
  const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  return {
    enabled: parseEnabled(map.autoConfirmReceiveEnabled),
    days: parseDays(map.autoConfirmReceiveDays),
  };
}

async function selectDueShippedOrderIds(days, limit = 80) {
  const pool = orderRepo.getPool();
  return orderRepo.selectDueShippedOrderIds(pool, days, limit, ORDER_STATUS.SHIPPED);
}

async function autoConfirmOneOrder(orderId) {
  const conn = await orderRepo.getConnection();
  try {
    await conn.beginTransaction();
    const order = await orderRepo.selectOrderByIdForUpdate(conn, orderId);
    if (!order || order.status !== ORDER_STATUS.SHIPPED) {
      await conn.rollback();
      return false;
    }
    await completeShippedOrder(conn, order, { trigger: 'auto_confirm_receive' });
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function runAutoConfirmReceiveTick() {
  const { enabled, days } = await loadAutoConfirmSettings();
  if (!enabled) return;
  const ids = await selectDueShippedOrderIds(days);
  let done = 0;
  for (const id of ids) {
    try {
      if (await autoConfirmOneOrder(id)) done += 1;
    } catch (err) {
      console.error('[autoConfirmReceive] order', id, err?.message || err);
    }
  }
  if (done > 0) console.log(`[autoConfirmReceive] auto-completed ${done} order(s)`);
}

function startAutoConfirmReceiveScheduler() {
  if (schedulerTimer) return;
  const intervalMs = Number(process.env.AUTO_CONFIRM_RECEIVE_INTERVAL_MS) || 15 * 60 * 1000;
  schedulerTimer = setInterval(() => {
    runAutoConfirmReceiveTick().catch((err) => {
      console.error('[autoConfirmReceive] tick failed:', err?.message || err);
    });
  }, intervalMs);
  setTimeout(() => {
    runAutoConfirmReceiveTick().catch((err) => {
      console.error('[autoConfirmReceive] initial tick failed:', err?.message || err);
    });
  }, 15_000);
}

module.exports = {
  loadAutoConfirmSettings,
  runAutoConfirmReceiveTick,
  startAutoConfirmReceiveScheduler,
};
