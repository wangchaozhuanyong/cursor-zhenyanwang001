const repo = require('../repository/coupon.repository');
const lifecycle = require('./couponLifecycle.service');

let schedulerTimer = null;

async function runCouponExpireTick() {
  return lifecycle.expireUserCouponsNow(repo.getPool(), { limit: 1000 });
}

function startCouponExpireScheduler() {
  if (schedulerTimer || process.env.COUPON_EXPIRE_SCHEDULER_DISABLED === '1') return;
  const intervalMs = Number(process.env.COUPON_EXPIRE_INTERVAL_MS) || 60 * 60 * 1000;
  schedulerTimer = setInterval(() => {
    runCouponExpireTick().catch((err) => {
      console.error('[couponExpire] tick failed:', err?.message || err);
    });
  }, intervalMs);
  if (schedulerTimer.unref) schedulerTimer.unref();
  setTimeout(() => {
    runCouponExpireTick().catch((err) => {
      console.error('[couponExpire] initial tick failed:', err?.message || err);
    });
  }, 5000).unref?.();
}

module.exports = {
  runCouponExpireTick,
  startCouponExpireScheduler,
};
