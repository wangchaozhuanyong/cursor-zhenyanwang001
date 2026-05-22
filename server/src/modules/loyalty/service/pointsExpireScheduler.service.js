const { runPointsExpireTick } = require('./pointsExpire.service');

let schedulerTimer = null;

function startPointsExpireScheduler() {
  if (schedulerTimer) return;
  if (process.env.POINTS_EXPIRE_SCHEDULER_DISABLED === '1') return;
  const intervalMs = Number(process.env.POINTS_EXPIRE_INTERVAL_MS) || 24 * 60 * 60 * 1000;
  schedulerTimer = setInterval(() => {
    runPointsExpireTick().catch((err) => {
      console.error('[pointsExpire] tick failed:', err?.message || err);
    });
  }, intervalMs);
  setTimeout(() => {
    runPointsExpireTick().catch((err) => {
      console.error('[pointsExpire] initial tick failed:', err?.message || err);
    });
  }, 60_000);
}

module.exports = {
  runPointsExpireTick,
  startPointsExpireScheduler,
};
