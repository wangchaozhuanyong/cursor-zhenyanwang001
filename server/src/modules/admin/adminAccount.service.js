const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./adminAccount.repository');
const authApi = require('../auth/auth.api');
const authRepo = require('../auth/auth.repository');

async function getProfile(userId) {
  const user = await repo.selectAdminProfileById(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  return {
    data: {
      id: user.id,
      /** 兼容旧前端字段：展示名优先用昵称 */
      username: user.nickname || user.phone,
      nickname: user.nickname,
      phone: user.phone,
      email: user.email != null ? user.email : '',
      avatar: user.avatar,
      role: user.role,
    },
  };
}

async function updateProfile(userId, body) {
  const nickname = body.nickname !== undefined ? body.nickname : body.username;
  const { avatar, phone, email } = body;
  const fields = [];
  const values = [];

  if (nickname !== undefined && nickname !== null && String(nickname).trim() !== '') {
    fields.push('nickname = ?');
    values.push(String(nickname).trim());
  }
  if (avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(avatar);
  }
  if (phone !== undefined && phone !== null) {
    const p = String(phone).trim();
    if (p) {
      const dup = await authRepo.findPhoneDuplicate(userId, p);
      if (dup) throw new BusinessError(409, '该手机号已被其他用户使用');
      fields.push('phone = ?');
      values.push(p);
    }
  }
  if (email !== undefined && email !== null) {
    fields.push('email = ?');
    values.push(String(email).trim());
  }

  if (fields.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  await repo.updateAdminProfileDynamic(fields, values, userId);
  return { data: null, message: '更新成功' };
}

async function changePassword(userId, body) {
  return authApi.changePassword(userId, body);
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
