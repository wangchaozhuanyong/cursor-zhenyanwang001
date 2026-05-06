const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const { rowsToCsv } = require('../../utils/csv');
const repo = require('./adminUser.repository');
const { writeAuditLog } = require('../../utils/auditLog');
const { formatUserResponse } = require('../../utils/formatUserResponse');

async function listUsers(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { keyword } = query;
  const { where, params } = repo.buildUserListWhere(keyword);
  const total = await repo.countUsers(where, params);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectUsersPage(where, params, pageSize, offset);
  return { kind: 'paginate', list: list.map((u) => formatUserResponse(u, 'admin')), total, page, pageSize };
}

async function getUserById(userId) {
  const user = await repo.selectUserSummaryById(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  const orderCount = await repo.countOrdersByUserId(userId);
  const totalSpentRaw = await repo.sumUserSpentExcludingCancelled(userId);
  user.orderCount = orderCount;
  user.totalSpent = parseFloat(totalSpentRaw);
  return { data: formatUserResponse(user, 'admin') };
}

async function updateUser(userId, body) {
  const fields = [];
  const values = [];
  for (const f of ['nickname', 'phone', 'avatar', 'wechat', 'whatsapp']) {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  if (body.points_balance !== undefined) {
    fields.push('points_balance = ?');
    values.push(body.points_balance);
  }
  if (fields.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  await repo.updateUserDynamic(fields, values, userId);
  return { data: null, message: '更新成功' };
}

async function updateSubordinate(userId, body) {
  const { subordinateEnabled } = body;
  await repo.updateSubordinateEnabled(userId, !!subordinateEnabled);
  return { data: null, message: '更新成功' };
}

async function adjustUserPoints(userId, body, adminUserId, req) {
  const { points, reason } = body;
  const beforeUser = await repo.selectUserSummaryById(userId);
  if (!beforeUser) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'user.points_adjust',
      objectType: 'user',
      objectId: userId,
      summary: '积分调整失败',
      result: 'failure',
      errorMessage: '用户不存在',
    });
    throw new BusinessError(404, '用户不存在');
  }
  const beforeBal = beforeUser.points_balance ?? 0;

  try {
    if (points === undefined) throw new BusinessError(400, '请输入积分数值');
    await repo.adjustPointsBalance(userId, points);
    await repo.insertPointsRecord({
      id: generateId(),
      userId,
      action: points > 0 ? 'admin_add' : 'admin_deduct',
      amount: points,
      description: reason || '管理员调整',
    });
    const afterBal = beforeBal + Number(points);
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'user.points_adjust',
      objectType: 'user',
      objectId: userId,
      summary: `积分调整 ${points > 0 ? '+' : ''}${points} ${reason || ''}`.trim(),
      before: { points_balance: beforeBal },
      after: { points_balance: afterBal },
      result: 'success',
    });
    return { data: null, message: '积分已调整' };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'user.points_adjust',
      objectType: 'user',
      objectId: userId,
      summary: '积分调整失败',
      before: { points_balance: beforeBal },
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

const USER_EXPORT_HEADERS = [
  'id', 'phone', 'nickname', 'invite_code', 'parent_invite_code', 'points_balance', 'wechat', 'whatsapp', 'created_at',
];

async function exportUsersCsv(query) {
  const { keyword } = query;
  const { where, params } = repo.buildUserListWhere(keyword);
  const rows = await repo.selectUsersForExport(where, params);
  const data = rows.map((u) => ({
    id: u.id,
    phone: u.phone,
    nickname: u.nickname || '',
    invite_code: u.invite_code || '',
    parent_invite_code: u.parent_invite_code || '',
    points_balance: u.points_balance ?? 0,
    wechat: u.wechat || '',
    whatsapp: u.whatsapp || '',
    created_at: u.created_at ? new Date(u.created_at).toISOString() : '',
  }));
  const csv = rowsToCsv(USER_EXPORT_HEADERS, data);
  return { csv, filename: `users_${Date.now()}.csv` };
}

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  updateSubordinate,
  adjustUserPoints,
  exportUsersCsv,
};
