const { generateId } = require('../../utils/helpers');
const repo = require('./points.repository');

async function getRecords(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { action } = query;
  const total = await repo.countRecords(userId, action);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectRecordsPage(userId, action, pageSize, offset);
  return { list: rows, total, page, pageSize };
}

async function getBalance(userId) {
  const balance = await repo.selectUserPointsBalance(userId);
  return { balance };
}

async function signIn(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await repo.findSignInToday(userId, today);
  if (existing) return { error: { code: 400, message: '今日已签到' } };

  let points = 5;
  try {
    const rule = await repo.selectSignInRule();
    if (rule && rule.enabled) points = rule.points;
    else if (rule && !rule.enabled) return { error: { code: 400, message: '签到功能已暂停' } };
  } catch { /* use default */ }

  const id = generateId();
  await repo.insertPointsRecord(id, userId, 'sign_in', points, '每日签到');
  await repo.addUserPoints(userId, points);
  return { data: { points }, message: '签到成功' };
}

module.exports = {
  getRecords,
  getBalance,
  signIn,
};
