const { klDateString } = require('../../../utils/klDateRange');
const { normalizeSettings } = require('./pointsEngine.service');
const loyaltyRepo = require('../repository/loyalty.repository');
const pointsRepo = require('../../user/repository/points.repository');
const { POINTS_ACTION } = require('../../../constants/pointsActions');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function computeExpiredAmount(records, expireDays, now = new Date()) {
  const days = Math.max(Math.trunc(Number(expireDays) || 0), 0);
  if (days <= 0) return 0;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const credits = [];
  for (const row of records || []) {
    const amount = Math.trunc(Number(row.amount) || 0);
    if (!amount || String(row.status || 'success') !== 'success') continue;
    if (amount > 0) {
      credits.push({ remaining: amount, createdAt: new Date(row.created_at) });
      continue;
    }
    let toConsume = -amount;
    for (const credit of credits) {
      if (toConsume <= 0) break;
      const take = Math.min(credit.remaining, toConsume);
      credit.remaining -= take;
      toConsume -= take;
    }
  }
  let expired = 0;
  for (const credit of credits) {
    if (credit.remaining > 0 && credit.createdAt < cutoff) expired += credit.remaining;
  }
  return expired;
}

async function expirePointsForUser(conn, userId, settings, options = {}) {
  const normalized = normalizeSettings(settings || {});
  if (!normalized.expire_enabled) return { skipped: true, reason: 'expire_disabled' };
  if (normalized.expire_days <= 0) return { skipped: true, reason: 'expire_days_not_configured' };

  const records = await pointsRepo.selectSuccessLedgerForUser(conn, userId);
  const expireAmount = computeExpiredAmount(records, normalized.expire_days, options.now);
  if (expireAmount <= 0) return { skipped: true, reason: 'nothing_to_expire' };

  const today = klDateString(options.now || new Date());
  return getUserApi().changeUserPoints(conn, {
    userId,
    amount: -expireAmount,
    action: POINTS_ACTION.POINTS_EXPIRE,
    description: `积分过期（${normalized.expire_days} 天）`,
    sourceType: 'points_expire',
    relatedRecordId: `points_expire:${userId}:${today}`,
    metadata: { expire_days: normalized.expire_days, expired_amount: expireAmount },
    allowNegative: false,
  });
}

async function runPointsExpireTick(options = {}) {
  const settings = options.settings || await loyaltyRepo.selectPointsSettings();
  const normalized = normalizeSettings(settings || {});
  if (!normalized.expire_enabled || normalized.expire_days <= 0) return { skipped: true, processed: 0 };

  const userIds = await pointsRepo.selectUserIdsWithPositiveBalance(options.limit || 200);
  let processed = 0;
  for (const userId of userIds) {
    const conn = await pointsRepo.getConnection();
    try {
      await conn.beginTransaction();
      const result = await expirePointsForUser(conn, userId, settings, options);
      await conn.commit();
      if (result && !result.skipped && Math.abs(Number(result.amount || 0)) > 0) processed += 1;
    } catch (err) {
      await conn.rollback();
      console.error('[pointsExpire] user', userId, err?.message || err);
    } finally {
      conn.release();
    }
  }
  if (processed > 0) console.log(`[pointsExpire] expired points for ${processed} user(s)`);
  return { processed, user_count: userIds.length };
}

module.exports = {
  computeExpiredAmount,
  expirePointsForUser,
  runPointsExpireTick,
};
