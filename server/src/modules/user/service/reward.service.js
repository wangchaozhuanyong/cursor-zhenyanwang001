const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/reward.repository');
const { REWARD_STATUS } = require('../../../constants/status');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');

function toMoney(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function calculateRewardAmount(orderAmount, rewardPercent) {
  const amount = toMoney(orderAmount);
  const percent = toMoney(rewardPercent);
  if (amount <= 0 || percent <= 0) return 0;
  return Math.floor(amount * percent) / 100;
}

function calculateRewardPoints(orderAmount, pointsPercent, fixedPoints) {
  const amount = toMoney(orderAmount);
  const percent = toMoney(pointsPercent);
  const fixed = Math.max(0, Math.floor(Number(fixedPoints || 0)));
  const byPercent = amount > 0 && percent > 0 ? Math.floor((amount * percent) / 100) : 0;
  return Math.max(byPercent, fixed);
}

function shouldSettleByTiming(timing, order, trigger = '') {
  const t = String(timing || 'order_completed').toLowerCase();
  const trig = String(trigger || '').toLowerCase();
  const paid = (order?.payment_status || '').toLowerCase() === PAYMENT_STATUS.PAID;
  const completed = (order?.status || '').toLowerCase() === ORDER_STATUS.COMPLETED;
  const shipped = (order?.status || '').toLowerCase() === ORDER_STATUS.SHIPPED;

  if (t === 'immediate') return true;
  if (t === 'order_paid' || t === 'payment_success') return paid || trig.includes('paid') || completed;
  if (t === 'order_shipped') return shipped || trig.includes('ship') || completed;
  return completed || trig.includes('completed') || trig.includes('confirm_receive');
}

async function getInviteAncestors(conn, buyerUserId, maxLevel) {
  const ancestors = [];
  let current = await repo.selectBuyerInviteInfo(conn, buyerUserId);
  for (let level = 1; level <= maxLevel; level += 1) {
    if (!current?.parent_invite_code) break;
    const ancestor = await repo.selectAncestorByInviteCode(conn, current.parent_invite_code);
    if (!ancestor) break;
    ancestors.push({ level, userId: ancestor.id });
    current = ancestor;
  }
  return ancestors;
}

async function settleOrderRewards(conn, order, options = {}) {
  if (!order?.id || !order.user_id) return { settled: 0, skipped: true };

  const rules = await repo.selectReferralRulesEnabled(conn);
  if (rules.length === 0) return { settled: 0, skipped: true };

  const maxLevel = Math.max(...rules.map((r) => Number(r.level) || 0));
  const ancestors = await getInviteAncestors(conn, order.user_id, maxLevel);
  if (ancestors.length === 0) return { settled: 0, skipped: true };

  const ruleByLevel = new Map(rules.map((r) => [Number(r.level), r]));
  const orderAmount = toMoney(order.total_amount);
  const trigger = options.trigger || '';
  let settled = 0;

  for (const ancestor of ancestors) {
    const rule = ruleByLevel.get(ancestor.level);
    if (!rule) continue;

    const rewardType = String(rule.reward_type || 'cash').toLowerCase();
    const settlementTiming = String(rule.settlement_timing || 'order_completed').toLowerCase();
    if (!shouldSettleByTiming(settlementTiming, order, trigger)) continue;

    const cashAmount = rewardType === 'points' ? 0 : calculateRewardAmount(orderAmount, rule.reward_percent);
    const pointsAmount = rewardType === 'cash' ? 0 : calculateRewardPoints(orderAmount, rule.points_percent, rule.fixed_points);
    if (cashAmount <= 0 && pointsAmount <= 0) continue;

    const recordId = generateId();
    const inserted = await repo.insertSettlementRecord(conn, {
      id: recordId,
      userId: ancestor.userId,
      orderId: order.id,
      orderNo: order.order_no,
      orderAmount,
      amount: cashAmount,
      rate: rule.reward_percent,
      level: ancestor.level,
      status: REWARD_STATUS.APPROVED,
      sourceType: 'order_completion',
      remark: `订单完成返现 ${order.order_no}`,
      metadata: {
        buyerUserId: order.user_id,
        rewardType,
        rewardPoints: pointsAmount,
        settlementTiming,
        operatorId: options.operatorId || null,
        trigger: trigger || 'order_completed',
      },
    });

    if (!inserted) continue;

    if (cashAmount > 0) {
      await repo.insertTransaction(conn, {
        id: generateId(),
        rewardRecordId: recordId,
        userId: ancestor.userId,
        orderId: order.id,
        orderNo: order.order_no,
        type: 'settle',
        amount: cashAmount,
        status: 'success',
        reason: `订单完成返现 Level ${ancestor.level}`,
        operatorId: options.operatorId,
        metadata: { buyerUserId: order.user_id, rate: rule.reward_percent, rewardType, rewardPoints: pointsAmount },
      });
    }

    if (pointsAmount > 0) {
      await repo.insertTransaction(conn, {
        id: generateId(),
        rewardRecordId: recordId,
        userId: ancestor.userId,
        orderId: order.id,
        orderNo: order.order_no,
        type: 'settle_points',
        amount: pointsAmount,
        status: 'success',
        reason: `订单完成邀请积分结算 Level ${ancestor.level}`,
        operatorId: options.operatorId,
        metadata: { buyerUserId: order.user_id, pointsPercent: rule.points_percent, fixedPoints: rule.fixed_points },
      });
    }

    settled += 1;
  }

  return { settled, skipped: settled === 0 };
}

async function reverseOrderRewards(conn, order, reason, options = {}) {
  if (!order?.id) return { reversed: 0, skipped: true };
  const records = await repo.selectRewardRecordsByOrderForUpdate(conn, order.id);
  let reversed = 0;
  for (const record of records) {
    const amount = toMoney(record.amount);
    const txs = await repo.selectTransactionsByRewardRecord(conn, record.id);
    const hasReverse = txs.some((t) => String(t.type) === 'reverse' || String(t.type) === 'reverse_points');
    if (hasReverse) continue;

    if (amount > 0) {
      await repo.insertTransaction(conn, {
        id: generateId(),
        rewardRecordId: record.id,
        userId: record.user_id,
        orderId: record.order_id,
        orderNo: record.order_no,
        type: 'reverse',
        amount: -amount,
        status: 'success',
        reason: reason || '订单退款/取消冲正',
        operatorId: options.operatorId,
        metadata: { trigger: options.trigger || 'order_reversal' },
      });
    }

    const pointsSettled = txs
      .filter((t) => String(t.type) === 'settle_points' && String(t.status || '') === 'success')
      .reduce((sum, t) => sum + Math.max(0, Number(t.amount || 0)), 0);
    if (pointsSettled > 0) {
      await repo.insertTransaction(conn, {
        id: generateId(),
        rewardRecordId: record.id,
        userId: record.user_id,
        orderId: record.order_id,
        orderNo: record.order_no,
        type: 'reverse_points',
        amount: -pointsSettled,
        status: 'success',
        reason: reason || '订单退款/取消冲正（积分）',
        operatorId: options.operatorId,
        metadata: { trigger: options.trigger || 'order_reversal' },
      });
    }

    await repo.markRewardRecordReversed(conn, record.id, reason || '订单退款/取消冲正');
    reversed += 1;
  }
  return { reversed, skipped: reversed === 0 };
}
async function getRecords(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { status } = query;
  const total = await repo.countRecords(userId, status);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectRecordsPage(userId, status, pageSize, offset);
  return { list: rows, total, page, pageSize };
}

async function getTransactions(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { type } = query;
  const total = await repo.countTransactions(userId, type);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectTransactionsPage(userId, type, pageSize, offset);
  return { list: rows, total, page, pageSize };
}

async function getAdminRecords(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const filters = {
    status: query.status || '',
    userId: query.userId || '',
    keyword: query.keyword || '',
  };
  const total = await repo.countAdminRecords(filters);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectAdminRecordsPage(filters, pageSize, offset);
  const stats = await repo.selectAdminStats();
  return { list, total, page, pageSize, stats };
}

async function withdraw(userId, body) {
  const amount = parseFloat(body.amount);
  if (!amount || amount <= 0 || !Number.isFinite(amount)) {
    return { error: { code: 400, message: '鎻愮幇閲戦蹇呴』澶т簬0' } };
  }

  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const available = await repo.sumAvailableForWithdraw(conn, userId);
    if (available < amount) {
      await conn.rollback();
      return { error: { code: 400, message: '余额不足' } };
    }
    const id = generateId();
    await repo.insertWithdrawRecord(conn, id, userId, amount);
    await conn.commit();
    return { message: '提现申请已提交' };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function getBalance(userId) {
  const result = await repo.selectBalanceSummary(userId);
  return {
    balance: parseFloat(result.balance),
    pendingWithdraw: parseFloat(result.pendingWithdraw),
    pendingAmount: parseFloat(result.pendingWithdraw),
    settledAmount: parseFloat(result.settledAmount),
    reversedAmount: parseFloat(result.reversedAmount),
  };
}

async function sumRewardTransactionsBalance(conn, userId) {
  return repo.sumUserRewardTransactions(conn, userId);
}

async function insertRewardTransaction(conn, params) {
  return repo.insertTransaction(conn, params);
}

module.exports = {
  settleOrderRewards,
  reverseOrderRewards,
  getRecords,
  getTransactions,
  getAdminRecords,
  withdraw,
  getBalance,
  sumRewardTransactionsBalance,
  insertRewardTransaction,
};



