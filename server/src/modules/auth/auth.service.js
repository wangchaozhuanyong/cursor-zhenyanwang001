const {
  generateId,
  generateInviteCode,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
} = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./auth.repository');

async function register(body) {
  const { phone, password, nickname, inviteCode } = body;
  if (!phone || !password) throw new BusinessError(400, '手机号和密码不能为空');
  if (password.length < 6) throw new BusinessError(400, '密码至少6位');

  const existing = await repo.findUserIdByPhone(phone);
  if (existing) throw new BusinessError(409, '该手机号已注册');

  const id = generateId();
  const hash = await hashPassword(password);
  const code = generateInviteCode();

  await repo.insertUser({
    id,
    phone,
    passwordHash: hash,
    nickname: nickname || '用户',
    inviteCode: code,
    parentInviteCode: inviteCode || '',
  });

  // 全库第一个注册用户自动成为管理员（与仅在建库时执行 extend3.sql 不同，避免「先 db:init 后注册」无管理员）
  const userCount = await repo.countUsers();
  if (userCount === 1) {
    await repo.setUserRole(id, 'admin');
  }

  const token = signToken(id, 0);
  return { data: { token, userId: id }, message: '注册成功' };
}

async function login(body) {
  const phone = body.phone || body.username;
  const { password } = body;
  if (!phone || !password) throw new BusinessError(400, '手机号和密码不能为空');

  const user = await repo.findUserByPhone(phone);
  if (!user) throw new BusinessError(401, '手机号或密码错误');

  const match = await comparePassword(password, user.password_hash);
  if (!match) throw new BusinessError(401, '手机号或密码错误');

  const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
  const token = signToken(user.id, rv);
  return {
    data: { token, userId: user.id, role: user.role || 'user' },
    message: '登录成功',
  };
}

async function getProfile(userId) {
  const user = await repo.selectProfileFields(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  return { data: user };
}

async function updateProfile(userId, body) {
  const { nickname, avatar, phone, wechat, whatsapp } = body;
  const fragments = [];
  const values = [];

  if (nickname !== undefined) {
    fragments.push('nickname = ?');
    values.push(nickname);
  }
  if (avatar !== undefined) {
    fragments.push('avatar = ?');
    values.push(avatar);
  }
  if (phone !== undefined) {
    const dup = await repo.findPhoneDuplicate(userId, phone);
    if (dup) throw new BusinessError(409, '该手机号已被其他用户使用');
    fragments.push('phone = ?');
    values.push(phone);
  }
  if (wechat !== undefined) {
    fragments.push('wechat = ?');
    values.push(wechat);
  }
  if (whatsapp !== undefined) {
    fragments.push('whatsapp = ?');
    values.push(whatsapp);
  }

  if (fragments.length === 0) throw new BusinessError(400, '没有需要更新的字段');

  await repo.updateUserProfile(userId, fragments, values);

  const user = await repo.selectProfileFields(userId);
  return { data: user, message: '资料已更新' };
}

async function changePassword(userId, body) {
  const { oldPassword, newPassword } = body;
  if (!oldPassword || !newPassword) throw new BusinessError(400, '请输入旧密码和新密码');
  if (newPassword.length < 6) throw new BusinessError(400, '新密码至少6位');

  const row = await repo.selectPasswordHash(userId);
  if (!row) throw new BusinessError(404, '用户不存在');

  const match = await comparePassword(oldPassword, row.password_hash);
  if (!match) throw new BusinessError(400, '旧密码错误');

  const hash = await hashPassword(newPassword);
  await repo.updatePasswordHash(userId, hash);
  return { data: null, message: '密码已更新' };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new BusinessError(400, 'refreshToken 不能为空');

  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new BusinessError(401, '刷新令牌已过期');
  }

  if (payload.type !== 'refresh') throw new BusinessError(401, '无效的刷新令牌');

  const user = await repo.selectRefreshVersion(payload.userId);
  if (!user) throw new BusinessError(401, '用户不存在');

  const ver = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
  if (payload.rv === undefined) {
    if (ver !== 0) throw new BusinessError(401, '刷新令牌已失效，请重新登录');
  } else if (Number(payload.rv) !== ver) {
    throw new BusinessError(401, '刷新令牌已失效，请重新登录');
  }

  const newToken = signToken(user.id, ver);
  return { data: { accessToken: newToken.accessToken } };
}

async function logout(userId) {
  if (userId) {
    await repo.incrementRefreshTokenVersion(userId);
  }
  return { data: null, message: '已退出登录' };
}

/** 供其他域（如 admin）在认证流程中查询用户，不经过 HTTP */
async function findUserByPhone(phone) {
  return repo.findUserByPhone(phone);
}

/** 使该用户 refresh 令牌失效（与 logout 内逻辑一致） */
async function bumpRefreshTokenVersion(userId) {
  if (userId) await repo.incrementRefreshTokenVersion(userId);
}

async function updateLastLogin(userId) {
  await repo.updateLastLogin(userId);
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refresh,
  logout,
  findUserByPhone,
  bumpRefreshTokenVersion,
  updateLastLogin,
};
