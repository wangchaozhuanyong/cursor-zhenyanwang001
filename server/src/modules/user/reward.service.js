const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');
const repo = require('./reward.repository');
const { REWARD_STATUS } = require('../../constants/status');

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
  let settled = 0;

  for (const ancestor of ancestors) {
    const rule = ruleByLevel.get(ancestor.level);
    if (!rule) continue;

    const amount = calculateRewardAmount(orderAmount, rule.reward_percent);
    if (amount <= 0) continue;

    const recordId = generateId();
    const inserted = await repo.insertSettlementRecord(conn, {
      id: recordId,
      userId: ancestor.userId,
      orderId: order.id,
      orderNo: order.order_no,
      orderAmount,
      amount,
      rate: rule.reward_percent,
      level: ancestor.level,
      status: REWARD_STATUS.APPROVED,
      sourceType: 'order_completion',
      remark: `订单完成返现 ${order.order_no}`,
      metadata: {
        buyerUserId: order.user_id,
        operatorId: options.operatorId || null,
        trigger: options.trigger || 'order_completed',
      },
    });

    if (!inserted) continue;

    await repo.insertTransaction(conn, {
      id: generateId(),
      rewardRecordId: recordId,
      userId: ancestor.userId,
      orderId: order.id,
      orderNo: order.order_no,
      type: 'settle',
      amount,
      status: 'success',
      reason: `订单完成返现 Level ${ancestor.level}`,
      operatorId: options.operatorId,
      metadata: { buyerUserId: order.user_id, rate: rule.reward_percent },
    });
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
    if (amount <= 0) continue;
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
    return { error: { code: 400, message: '提现金额必须大于0' } };
  }

  const conn = await db.getConnection();
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

module.exports = {
  settleOrderRewards,
  reverseOrderRewards,
  getRecords,
  getTransactions,
  getAdminRecords,
  withdraw,
  getBalance,
};
