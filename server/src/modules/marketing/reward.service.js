const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');
const repo = require('./reward.repository');

async function getRecords(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { status } = query;
  const total = await repo.countRecords(userId, status);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectRecordsPage(userId, status, pageSize, offset);
  return { list: rows, total, page, pageSize };
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
  };
}

module.exports = {
  getRecords,
  withdraw,
  getBalance,
};
