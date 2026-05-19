/**
 * 绔欑偣璁剧疆銆屽彂璐у悗 N 澶╄嚜鍔ㄧ‘璁ゆ敹璐с€嶏細瀹氭椂鎵弿宸插彂璐ц鍗曞苟缃负宸插畬鎴愶紙缁撶畻绉垎/杩旂幇锛夈€? */
const { ORDER_STATUS } = require('../../../constants/status');
const orderRepo = require('../repository/order.repository');
const { completeShippedOrder } = require('./order.service');
const { loadAutoConfirmSettings } = require('./orderAutoConfirmSettings.service');

let schedulerTimer = null;

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




