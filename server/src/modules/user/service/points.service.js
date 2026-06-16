const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { POINTS_ACTION } = require('../../../constants/pointsActions');
const { klDateString } = require('../../../utils/klDateRange');
const repo = require('../repository/points.repository');

function getLoyaltyApi() {
  return /** @type {any} */ (require('../../loyalty/publicApi')) || {};
}

function getOrderApi() {
  return /** @type {any} */ (require('../../order/publicApi')) || {};
}

function getMarketingApi() {
  return /** @type {any} */ (require('../../marketing/publicApi')) || {};
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function isOrderPointsAction(action) {
  const orderActions = /** @type {Set<string>} */ (new Set([
    POINTS_ACTION.ORDER_REDEEM,
    POINTS_ACTION.ORDER_REDEEM_REVERSE,
    POINTS_ACTION.ORDER_EARN,
    POINTS_ACTION.ORDER_EARN_REVERSE,
  ]));
  return orderActions.has(String(action || ''));
}

async function changeUserPoints(conn, params) {
  const {
    userId,
    amount,
    action,
    description,
    orderId,
    orderNo,
    sourceType,
    relatedRecordId,
    operatorId,
    metadata,
    allowNegative = false,
    pendingOnInsufficient = false,
  } = params;

  const delta = toInt(amount);
  if (!userId) throw new BusinessError(400, '缺少用户 ID');
  if (!action) throw new BusinessError(400, '缺少积分操作类型');
  if (!delta) return { skipped: true, amount: 0 };

  let finalRelatedRecordId = relatedRecordId;
  if (!finalRelatedRecordId && isOrderPointsAction(action)) {
    throw new BusinessError(400, '订单积分操作缺少关联记录 ID');
  }
  if (!finalRelatedRecordId && sourceType === 'admin_adjust') {
    finalRelatedRecordId = `admin_adjust:${generateId()}`;
  }

  if (finalRelatedRecordId) {
    const existing = await repo.selectRecordByRelatedForUpdate(conn, finalRelatedRecordId, action);
    if (existing) return { skipped: true, record: existing };
  }

  const account = await repo.selectAccountForUpdate(conn, userId);
  if (!account) throw new BusinessError(404, '积分账户不存在');
  const before = toInt(account.balance);
  let effectiveDelta = delta;
  let pendingReverseOffset = 0;
  const pendingReverseDetails = [];

  if (delta > 0) {
    const pendingRecords = await repo.selectPendingReverseRecordsForUpdate(conn, userId);
    let remainingGrant = delta;
    for (const pending of pendingRecords) {
      if (remainingGrant <= 0) break;
      const pendingAmount = Math.abs(toInt(pending.amount));
      if (pendingAmount <= 0) continue;
      const offset = Math.min(remainingGrant, pendingAmount);
      const remainingPending = pendingAmount - offset;
      remainingGrant -= offset;
      pendingReverseOffset += offset;
      pendingReverseDetails.push({
        id: pending.id,
        related_record_id: pending.related_record_id,
        offset,
        remaining: remainingPending,
      });
      await repo.updatePendingReverseRecord(conn, pending.id, {
        amount: remainingPending > 0 ? -remainingPending : 0,
        status: remainingPending > 0 ? 'pending' : 'resolved',
        metadata: {
          ...parseMetadata(pending.metadata),
          last_offset_action: action,
          last_offset_related_record_id: finalRelatedRecordId || null,
          last_offset_amount: offset,
          remaining_amount: remainingPending,
        },
      });
    }
    effectiveDelta = remainingGrant;
  }

  const after = before + effectiveDelta;
  if (!allowNegative && after < 0) {
    if (pendingOnInsufficient) {
      const pendingAction = action === POINTS_ACTION.ORDER_EARN_REVERSE ? POINTS_ACTION.PENDING_REVERSE : `${action}_pending`;
      const pendingRelatedRecordId = finalRelatedRecordId
        ? `${pendingAction}:${finalRelatedRecordId}`
        : `${pendingAction}:${generateId()}`;
      const existingPending = await repo.selectRecordByRelatedForUpdate(conn, pendingRelatedRecordId, pendingAction);
      if (existingPending) return { skipped: true, record: existingPending };
      const pendingRecordId = generateId();
      await repo.insertLedgerRecord(conn, {
        id: pendingRecordId,
        userId,
        orderId,
        orderNo,
        action: pendingAction,
        amount: delta,
        balanceBefore: before,
        balanceAfter: before,
        description: description || '积分回滚待处理',
        sourceType,
        relatedRecordId: pendingRelatedRecordId,
        status: 'pending',
        operatorId,
        metadata: { ...(metadata || {}), insufficient_balance: true, requested_amount: delta },
      });
      return { skipped: false, pending: true, recordId: pendingRecordId, balanceBefore: before, balanceAfter: before, amount: 0 };
    }
    throw new BusinessError(400, '积分余额不足');
  }

  if (effectiveDelta !== 0) {
    await repo.updateAccountBalance(conn, userId, effectiveDelta, after);
  }
  const recordId = generateId();
  await repo.insertLedgerRecord(conn, {
    id: recordId,
    userId,
    orderId,
    orderNo,
    action,
    amount: effectiveDelta,
    balanceBefore: before,
    balanceAfter: after,
    description,
    sourceType,
    relatedRecordId: finalRelatedRecordId,
    status: 'success',
    operatorId,
    metadata: pendingReverseOffset > 0
      ? {
        ...(metadata || {}),
        requested_amount: delta,
        pending_reverse_offset: pendingReverseOffset,
        pending_reverse_details: pendingReverseDetails,
      }
      : metadata,
  });
  return {
    skipped: false,
    recordId,
    balanceBefore: before,
    balanceAfter: after,
    amount: effectiveDelta,
    pendingReverseOffset,
  };
}

async function changePoints(conn, params) {
  return changeUserPoints(conn, params);
}

async function runInTransaction(fn) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getRecords(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { action } = query;
  const total = await repo.countRecords(userId, action);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectRecordsPage(userId, action, pageSize, offset);
  return { list: rows, total, page, pageSize };
}

async function getAdminRecords(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const filters = {
    action: query.action || '',
    userId: query.userId || '',
    keyword: query.keyword || '',
  };
  const total = await repo.countAdminRecords(filters);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectAdminRecordsPage(filters, pageSize, offset);
  const stats = await repo.selectAdminStats();
  return { list, total, page, pageSize, stats };
}

async function getBalance(userId) {
  const balance = await repo.selectUserPointsBalance(userId);
  return { balance };
}

async function hasPendingReverse(userId) {
  return repo.hasPendingReverse(userId);
}

async function resolveSignInAward() {
  let points = 5;
  let enabled = true;
  let hasRule = false;
  try {
    const rule = await repo.selectSignInRule();
    if (rule) {
      hasRule = true;
      points = toInt(rule.points);
      enabled = !!rule.enabled;
    }
  } catch {
    /* 鐞涖劍婀潻浣盒╃粵澶婄磽鐢憡妞傞崶鐐衡偓鈧妯款吇 */
  }
  return { points, enabled, hasRule };
}

async function resolveActiveCheckinReward() {
  const fn = getMarketingApi().resolveCheckinReward;
  if (typeof fn !== 'function') return null;
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function resolveSignInAwardForUser(userId) {
  const activity = await resolveActiveCheckinReward();
  if (activity && toInt(activity.reward_points) >= 1) {
    return {
      points: toInt(activity.reward_points),
      enabled: true,
      hasRule: true,
      source: 'activity',
      activity,
    };
  }
  return {
    ...(await resolveSignInAward()),
    source: 'points_rule',
    activity: null,
    userId,
  };
}

async function resolveConfiguredBonus(conn, action) {
  let rule = null;
  try {
    rule = await repo.selectPointsRuleByAction(conn, action);
  } catch {
    rule = null;
  }
  if (!rule) return { points: 0, enabled: false, hasRule: false };
  return {
    points: toInt(rule.points),
    enabled: !!rule.enabled,
    hasRule: true,
  };
}

async function awardConfiguredPointsBonus(conn, params) {
  const {
    userId,
    action,
    description,
    sourceType,
    relatedRecordId,
    orderId,
    orderNo,
    operatorId,
    metadata,
  } = params;
  const { points, enabled, hasRule } = await resolveConfiguredBonus(conn, action);
  if (!hasRule) return { skipped: true, reason: 'rule_missing' };
  if (!enabled) return { skipped: true, reason: 'rule_disabled' };
  if (points < 1) return { skipped: true, reason: 'rule_points_invalid' };
  return changeUserPoints(conn, {
    userId,
    amount: points,
    action,
    description,
    sourceType,
    relatedRecordId,
    orderId,
    orderNo,
    operatorId,
    metadata,
  });
}

async function awardConfiguredPointsBonusForUser(params) {
  return runInTransaction((conn) => awardConfiguredPointsBonus(conn, params));
}

async function getClientPointsConfig() {
  const { points, enabled, hasRule, source, activity } = await resolveSignInAwardForUser(null);
  const pointsSettings = await getLoyaltyApi().selectPointsSettings();
  const settleTiming = pointsSettings?.settle_timing || 'order_completed';
  const p = toInt(points);
  const configInvalid = hasRule && enabled && p < 1;
  return {
    signIn: {
      points: hasRule ? p : 5,
      /** 鐟欏嫬鍨€涙ê婀稉鏂挎儙閻劋绗栫粔顖氬瀻閳? 閹靛秴褰茬粵鎯у煂閿涙稒婀柊宥囩枂鐟欏嫬鍨弮鏈电瑢姒涙顓?5 閸掑棔绔撮懛?*/
      enabled: hasRule ? enabled && !configInvalid : true,
      usesDefault: !hasRule,
      disabledReason: !hasRule
        ? null
        : !enabled
          ? '每日签到积分规则已被后台关闭'
          : configInvalid
            ? '每日签到积分必须至少为 1'
            : null,
      source,
      activityId: activity?.activity_id || null,
      activityTitle: activity?.title || '',
    },
    orderPointsHint: getLoyaltyApi().getOrderPointsHint(settleTiming),
    settleTiming,
  };
}

async function signIn(userId) {
  const today = klDateString();
  const existing = await repo.findSignInToday(userId, today);
  if (existing) return { error: { code: 400, message: '今天已经签到过了' } };

  const { points, enabled, hasRule, source, activity } = await resolveSignInAwardForUser(userId);
  if (hasRule && !enabled) return { error: { code: 400, message: '每日签到积分规则已关闭' } };
  const grant = hasRule ? toInt(points) : 5;
  if (grant < 1) return { error: { code: 400, message: '每日签到积分必须至少为 1' } };
  if (activity?.activity_id) {
    const usage = await repo.countSignInActivityUsage(activity.activity_id, userId);
    const totalLimit = Number(activity.usage_limit_total || 0);
    if (totalLimit > 0 && usage.total_count + 1 > totalLimit) {
      return { error: { code: 400, message: '签到活动总次数已达上限' } };
    }
    const userLimit = Number(activity.usage_limit_per_user || 0);
    if (userLimit > 0 && usage.user_count + 1 > userLimit) {
      return { error: { code: 400, message: '您已达到该签到活动可参与次数上限' } };
    }
  }

  await runInTransaction((conn) => changePoints(conn, {
    userId,
    amount: grant,
    action: POINTS_ACTION.SIGN_IN,
    description: activity?.title ? `签到奖励：${activity.title}` : '每日签到',
    sourceType: 'sign_in',
    relatedRecordId: `sign_in:${userId}:${today}`,
    metadata: activity?.activity_id
      ? {
        source,
        activity_id: activity.activity_id,
        activity_title: activity.title || '',
        activity_type: 'checkin_reward',
        version: Number(activity.version || 1),
        reward_points: grant,
      }
      : { source },
  }));
  return {
    data: {
      points: grant,
      activity_id: activity?.activity_id || null,
      activity_title: activity?.title || '',
    },
    message: '签到成功',
  };
}

async function adjustUserPoints(userId, amount, reason, operatorId) {
  const pointsSettings = await getLoyaltyApi().selectPointsSettings();
  const allowNegative = !!getLoyaltyApi().normalizePointsSettings(pointsSettings || {}).allow_negative_points;
  return runInTransaction((conn) => changeUserPoints(conn, {
    userId,
    amount,
    action: amount > 0 ? POINTS_ACTION.ADMIN_ADD : POINTS_ACTION.ADMIN_DEDUCT,
    description: reason || '后台积分调整',
    sourceType: 'admin_adjust',
    operatorId,
    allowNegative,
  }));
}

async function settleOrderPoints(conn, order, options = {}) {
  return getOrderApi().grantOrderEarnPoints(conn, order, options);
}

async function reverseOrderPoints(conn, order, reason, options = {}) {
  return getOrderApi().reverseOrderEarnPoints(conn, order, {
    ...options,
    description: reason || options.description,
  });
}
module.exports = {
  changeUserPoints,
  changePoints,
  settleOrderPoints,
  reverseOrderPoints,
  adjustUserPoints,
  awardConfiguredPointsBonus,
  awardConfiguredPointsBonusForUser,
  getRecords,
  getAdminRecords,
  getBalance,
  hasPendingReverse,
  getClientPointsConfig,
  signIn,
};
