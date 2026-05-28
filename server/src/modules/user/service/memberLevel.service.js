const repo = require('../repository/memberLevel.repository');

const pool = repo.getPool();

function normalizeLevel(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    min_spent: Number(row.min_spent || 0),
    min_orders: Number(row.min_orders || 0),
    discount_rate: Number(row.discount_rate || 1),
    points_multiplier: Number(row.points_multiplier || 1),
    free_shipping_enabled: Boolean(row.free_shipping_enabled),
    sort_order: Number(row.sort_order || 0),
    enabled: Boolean(row.enabled),
    is_default: Boolean(row.is_default),
    member_level_manual_locked: Boolean(row.member_level_manual_locked),
    member_level_manual_reason: row.member_level_manual_reason || '',
    member_level_manual_at: row.member_level_manual_at || null,
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

function buildBenefits(level) {
  if (!level) return [];
  const benefits = [];
  if (Number(level.discount_rate || 1) < 1) {
    benefits.push({
      type: 'discount',
      name: '????',
      icon: 'badge-percent',
      description: `???? ${(Number(level.discount_rate) * 10).toFixed(1).replace(/\.0$/, '')} ???`,
    });
  }
  if (Number(level.points_multiplier || 1) > 1) {
    benefits.push({
      type: 'points_multiplier',
      name: '????',
      icon: 'sparkles',
      description: `????? ${Number(level.points_multiplier).toFixed(2).replace(/\.00$/, '')} ???`,
    });
  }
  if (level.free_shipping_enabled) {
    benefits.push({
      type: 'free_shipping',
      name: '????',
      icon: 'truck',
      description: '?????????????',
    });
  }
  if (!benefits.length) {
    benefits.push({
      type: 'standard',
      name: '??????',
      icon: 'shield-check',
      description: level.description || '??????????????',
    });
  }
  return benefits;
}

function normalizeStats(row) {
  return {
    totalSpent: Number(row?.totalSpent ?? row?.total_spent ?? 0),
    orderCount: Number(row?.orderCount ?? row?.order_count ?? 0),
  };
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

async function getMemberBenefitsOverview(userId) {
  const [currentBundle, levels, userRows] = await Promise.all([
    getUserMemberLevel(userId),
    repo.selectEnabledLevels(pool).catch(() => []),
    pool.query(
      `SELECT id, nickname, avatar, points_balance, birthday
       FROM users
       WHERE id = ? AND deleted_at IS NULL`,
      [userId],
    ).catch(() => [[]]),
  ]);
  const user = userRows?.[0]?.[0] || {};
  const currentLevel = currentBundle.level;
  const stats = normalizeStats(currentBundle.stats);
  const normalizedLevels = levels.map(normalizeLevel).filter(Boolean);
  const currentIndex = normalizedLevels.findIndex((level) => level.id === currentLevel?.id);
  const nextLevel = currentIndex >= 0 ? normalizedLevels[currentIndex + 1] || null : normalizedLevels[0] || null;
  const currentSpent = stats.totalSpent;
  const currentOrders = stats.orderCount;
  const spentToNext = nextLevel ? Math.max(0, Number(nextLevel.min_spent || 0) - currentSpent) : 0;
  const ordersToNext = nextLevel ? Math.max(0, Number(nextLevel.min_orders || 0) - currentOrders) : 0;

  return {
    data: {
      user_id: user.id || userId,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      current_points: Number(user.points_balance || 0),
      current_growth_value: currentSpent,
      birthday_completed: Boolean(user.birthday),
      profile_completed: Boolean(user.nickname && user.avatar && user.birthday),
      current_level: currentLevel ? {
        ...currentLevel,
        benefits: buildBenefits(currentLevel),
      } : null,
      next_level: nextLevel,
      points_to_next_level: spentToNext,
      growth_to_next_level: spentToNext,
      orders_to_next_level: ordersToNext,
      all_levels: normalizedLevels.map((level) => ({
        ...level,
        benefits: buildBenefits(level),
      })),
      stats: {
        total_spent: currentSpent,
        order_count: currentOrders,
      },
    },
  };
}

async function refreshUserMemberLevel(q, userId, options = {}) {
  if (!userId) return { changed: false, level: null, stats: { totalSpent: 0, orderCount: 0 } };
  try {
    const levels = await repo.selectEnabledLevels(q);
    const current = await repo.selectUserCurrentLevel(q, userId);
    const stats = await repo.selectUserPaidStats(q, userId);
    if (current?.member_level_manual_locked && !options.force) {
      return {
        changed: false,
        skipped: true,
        skippedReason: 'manual_locked',
        previousLevel: normalizeLevel(current),
        level: normalizeLevel(current),
        stats,
      };
    }
    const defaultLevel = await repo.selectDefaultLevel(q);
    const best = pickBestLevel(levels, stats) || defaultLevel;
    if (!best?.id) return { changed: false, level: normalizeLevel(current), stats };
    const changed = current?.id !== best.id;
    if (changed) {
      await repo.updateUserMemberLevelCalculated(q, userId, best.id);
    } else if (current?.member_level_manual_locked && options.force) {
      await repo.updateUserMemberLevelCalculated(q, userId, best.id);
    }
    return {
      changed,
      previousLevel: normalizeLevel(current),
      level: normalizeLevel(best),
      stats,
    };
  } catch (err) {
    /** 等级表未迁移�?SQL 异常时不得阻断支�?返现钱包事务 */
    console.error('[memberLevel] refreshUserMemberLevel skipped:', err?.code || '', err?.message || err);
    return { changed: false, level: null, stats: { totalSpent: 0, orderCount: 0 }, skipped: true };
  }
}

module.exports = {
  getUserMemberLevel,
  getMemberBenefitsOverview,
  refreshUserMemberLevel,
  normalizeLevel,
};

