const repo = require('./invite.repository');

async function getStats(userId) {
  const user = await repo.selectUserInviteCode(userId);
  if (!user) return { error: { code: 404, message: '用户不存在' } };

  const directCount = await repo.countDirectByParentCode(user.invite_code);
  const totalOrderAmount = await repo.sumOrderAmountByParentCode(user.invite_code);

  let totalReward = 0;
  try {
    totalReward = await repo.sumPositiveRewards(userId);
  } catch { /* table may not exist */ }

  let indirectCount = 0;
  try {
    const directUsers = await repo.selectDirectInviteCodes(user.invite_code);
    const directCodes = [];
    directUsers.forEach((u) => {
      if (u.invite_code) directCodes.push(u.invite_code);
    });
    if (directCodes.length > 0) {
      indirectCount = await repo.countByParentCodes(directCodes);
    }
  } catch { /* best-effort */ }

  return {
    totalInvited: directCount,
    totalReward,
    directCount,
    indirectCount,
    totalOrderAmount: parseFloat(totalOrderAmount),
  };
}

async function bind(userId, body) {
  const { inviteCode } = body;
  if (!inviteCode) return { error: { code: 400, message: '邀请码不能为空' } };

  const self = await repo.selectParentInvite(userId);
  if (self.parent_invite_code) return { error: { code: 400, message: '你已绑定过邀请码' } };

  const inviter = await repo.selectUserIdByInviteCode(inviteCode);
  if (!inviter) return { error: { code: 404, message: '邀请码不存在' } };
  if (inviter.id === userId) return { error: { code: 400, message: '不能绑定自己的邀请码' } };

  await repo.updateParentInviteCode(userId, inviteCode);
  return { message: '绑定成功' };
}

async function getRecords(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));

  const user = await repo.selectUserInviteCode(userId);
  if (!user?.invite_code) {
    return { list: [], total: 0, page, pageSize };
  }
  const total = await repo.countInviteesByCode(user.invite_code);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectInviteRecordsPage(userId, user.invite_code, pageSize, offset);

  const list = rows.map((r) => ({
    id: r.id,
    inviter_id: userId,
    invitee_id: r.id,
    invitee_nickname: r.nickname,
    invitee_avatar: r.avatar || '',
    invite_code: user.invite_code,
    status: r.order_count > 0 ? 'ordered' : 'registered',
    reward_amount: parseFloat(r.reward_amount),
    created_at: r.created_at,
  }));

  return { list, total, page, pageSize };
}

module.exports = {
  getStats,
  bind,
  getRecords,
};
