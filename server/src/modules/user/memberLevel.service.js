const repo = require('./memberLevel.repository');

const pool = repo.getPool();

function normalizeLevel(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    min_spent: Number(row.min_spent || 0),
    min_orders: Number(row.min_orders || 0),
    sort_order: Number(row.sort_order || 0),
    enabled: Boolean(row.enabled),
    is_default: Boolean(row.is_default),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function qualifies(level, stats) {
  const minSpent = Number(level.min_spent || 0);
  const minOrders = Number(level.min_orders || 0);
  if (minSpent <= 0 && minOrders <= 0) return true;
  return stats.totalSpent >= minSpent || stats.orderCount >= minOrders;
}

function pickBestLevel(levels, stats) {
  const qualified = levels.filter((level) => qualifies(level, stats));
  if (!qualified.length) return null;
  return qualified.sort((a, b) => {
    const sortDiff = Number(b.sort_order || 0) - Number(a.sort_order || 0);
    if (sortDiff !== 0) return sortDiff;
    const spentDiff = Number(b.min_spent || 0) - Number(a.min_spent || 0);
    if (spentDiff !== 0) return spentDiff;
    return Number(b.min_orders || 0) - Number(a.min_orders || 0);
  })[0];
}

async function getUserMemberLevel(userId) {
  try {
    const [current, stats, defaultLevel] = await Promise.all([
      repo.selectUserCurrentLevel(pool, userId),
      repo.selectUserPaidStats(pool, userId),
      repo.selectDefaultLevel(pool),
    ]);
    return {
      level: normalizeLevel(current || defaultLevel),
      stats,
    };
  } catch (err) {
    console.error('[memberLevel] getUserMemberLevel failed:', err?.code || '', err?.message || err);
    return { level: null, stats: { totalSpent: 0, orderCount: 0 } };
  }
}

async function refreshUserMemberLevel(q, userId) {
  if (!userId) return { changed: false, level: null, stats: { totalSpent: 0, orderCount: 0 } };
  try {
    const levels = await repo.selectEnabledLevels(q);
    const current = await repo.selectUserCurrentLevel(q, userId);
    const stats = await repo.selectUserPaidStats(q, userId);
    const defaultLevel = await repo.selectDefaultLevel(q);
    const best = pickBestLevel(levels, stats) || defaultLevel;
    if (!best?.id) return { changed: false, level: normalizeLevel(current), stats };
    const changed = current?.id !== best.id;
    if (changed) {
      await repo.updateUserMemberLevel(q, userId, best.id);
    }
    return {
      changed,
      previousLevel: normalizeLevel(current),
      level: normalizeLevel(best),
      stats,
    };
  } catch (err) {
    /** 等级表未迁移或 SQL 异常时不得阻断支付/返现钱包事务 */
    console.error('[memberLevel] refreshUserMemberLevel skipped:', err?.code || '', err?.message || err);
    return { changed: false, level: null, stats: { totalSpent: 0, orderCount: 0 }, skipped: true };
  }
}

module.exports = {
  getUserMemberLevel,
  refreshUserMemberLevel,
  normalizeLevel,
};
