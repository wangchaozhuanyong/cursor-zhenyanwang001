const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./points.repository');

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function changePoints(conn, params) {
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
    allowNegative = true,
  } = params;

  const delta = toInt(amount);
  if (!userId) throw new BusinessError(400, '用户不能为空');
  if (!action) throw new BusinessError(400, '积分动作不能为空');
  if (!delta) return { skipped: true, amount: 0 };

  if (relatedRecordId) {
    const existing = await repo.selectRecordByRelatedForUpdate(conn, relatedRecordId, action);
    if (existing) return { skipped: true, record: existing };
  }

  const account = await repo.selectAccountForUpdate(conn, userId);
  if (!account) throw new BusinessError(404, '用户积分账户不存在');
  const before = toInt(account.balance);
  const after = before + delta;
  if (!allowNegative && after < 0) {
    throw new BusinessError(400, '积分余额不足');
  }

  await repo.updateAccountBalance(conn, userId, delta, after);
  const recordId = generateId();
  await repo.insertLedgerRecord(conn, {
    id: recordId,
    userId,
    orderId,
    orderNo,
    action,
    amount: delta,
    balanceBefore: before,
    balanceAfter: after,
    description,
    sourceType,
    relatedRecordId,
    status: 'success',
    operatorId,
    metadata,
  });
  return { skipped: false, recordId, balanceBefore: before, balanceAfter: after, amount: delta };
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
    /* 表未迁移等异常时回退默认 */
  }
  return { points, enabled, hasRule };
}

async function getClientPointsConfig() {
  const { points, enabled, hasRule } = await resolveSignInAward();
  const p = toInt(points);
  const configInvalid = hasRule && enabled && p < 1;
  return {
    signIn: {
      points: hasRule ? p : 5,
      /** 规则存在且启用且积分≥1 才可签到；未配置规则时与默认 5 分一致 */
      enabled: hasRule ? enabled && !configInvalid : true,
      usesDefault: !hasRule,
      disabledReason: !hasRule
        ? null
        : !enabled
          ? '签到功能已在后台关闭'
          : configInvalid
            ? '后台签到积分须至少为 1'
            : null,
    },
    /** 订单积分来自商品「积分值」字段，支付完成后入账 */
    orderPointsHint: '订单支付完成后，按商品所设积分累计发放',
  };
}

async function signIn(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await repo.findSignInToday(userId, today);
  if (existing) return { error: { code: 400, message: '今日已签到' } };

  const { points, enabled, hasRule } = await resolveSignInAward();
  if (hasRule && !enabled) return { error: { code: 400, message: '签到功能已暂停' } };
  const grant = hasRule ? toInt(points) : 5;
  if (grant < 1) return { error: { code: 400, message: '请在后台将每日签到积分设为至少 1' } };

  await runInTransaction((conn) => changePoints(conn, {
    userId,
    amount: grant,
    action: 'sign_in',
    description: '每日签到',
    sourceType: 'sign_in',
    relatedRecordId: `sign_in:${userId}:${today}`,
  }));
  return { data: { points: grant }, message: '签到成功' };
}

async function adjustUserPoints(userId, amount, reason, operatorId) {
  return runInTransaction((conn) => changePoints(conn, {
    userId,
    amount,
    action: amount > 0 ? 'admin_add' : 'admin_deduct',
    description: reason || '管理员调整',
    sourceType: 'admin_adjust',
    operatorId,
  }));
}

async function settleOrderPoints(conn, order, options = {}) {
  const amount = toInt(order?.total_points);
  if (!order?.id || !order.user_id || amount <= 0) return { skipped: true };
  return changePoints(conn, {
    userId: order.user_id,
    amount,
    action: 'order_earn',
    description: `订单完成奖励 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'order_completion',
    relatedRecordId: `order_earn:${order.id}`,
    operatorId: options.operatorId,
    metadata: { trigger: options.trigger || 'order_completed' },
  });
}

async function reverseOrderPoints(conn, order, reason, options = {}) {
  const amount = toInt(order?.total_points);
  if (!order?.id || !order.user_id || amount <= 0) return { skipped: true };
  const earned = await repo.selectRecordByRelatedForUpdate(conn, `order_earn:${order.id}`, 'order_earn');
  if (!earned) return { skipped: true };
  return changePoints(conn, {
    userId: order.user_id,
    amount: -amount,
    action: 'order_reverse',
    description: reason || `订单积分回滚 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'order_reversal',
    relatedRecordId: `order_reverse:${order.id}`,
    operatorId: options.operatorId,
    metadata: { trigger: options.trigger || 'order_reversal' },
  });
}

module.exports = {
  changePoints,
  settleOrderPoints,
  reverseOrderPoints,
  adjustUserPoints,
  getRecords,
  getAdminRecords,
  getBalance,
  getClientPointsConfig,
  signIn,
};
