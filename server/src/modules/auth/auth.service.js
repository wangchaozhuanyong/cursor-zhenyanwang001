/**
 * Auth Service：注册、登录、刷新令牌、登出、资料、改密
 *
 * 分层约定：
 * - controller 仅传入「已通过 schemas 校验的 req.body / req.user」
 * - service 不直接拼 SQL，所有 DB 访问通过 `./auth.repository`
 * - service 抛 AppError 子类（BusinessError/NotFoundError/...），由 errorHandler 统一映射
 */
const {
  generateId,
  generateInviteCode,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
} = require('../../utils/helpers');
const {
  BusinessError,
  AuthError,
  NotFoundError,
  ConflictError,
  ValidationError,
} = require('../../errors');
const repo = require('./auth.repository');
const { formatUserResponse } = require('../../utils/formatUserResponse');
const { normalizeIntlPhone, buildPhoneLookupCandidates } = require('../../utils/phone');

async function register(body) {
  const { phone, countryCode, password, nickname, inviteCode } = body;
  const normalizedPhone = normalizeIntlPhone(phone, countryCode);
  if (!normalizedPhone) throw new ValidationError('手机号格式不正确');

  const existing = await repo.findUserIdByPhones(buildPhoneLookupCandidates(phone, countryCode));
  if (existing) throw new ConflictError('该手机号已注册');
  const parentInviteCode = String(inviteCode || '').trim().toUpperCase();
  if (parentInviteCode) {
    const inviter = await repo.selectUserIdByInviteCode(parentInviteCode);
    if (!inviter) throw new ValidationError('邀请码不存在');
  }

  const id = generateId();
  const hash = await hashPassword(password);
  const code = generateInviteCode();

  await repo.insertUser({
    id,
    phone: normalizedPhone,
    passwordHash: hash,
    nickname: nickname || '用户',
    inviteCode: code,
    parentInviteCode,
  });

  /** 全库第一个注册用户自动成为管理员（与仅在建库时执行 extend3.sql 不同，避免「先 db:init 后注册」无管理员） */
  const userCount = await repo.countUsers();
  if (userCount === 1) {
    await repo.setUserRole(id, 'admin');
  }

  const token = signToken(id, 0);
  return { data: { token, userId: id }, message: '注册成功' };
}

async function login(body) {
  const phone = body.phone || body.username;
  const countryCode = body.countryCode;
  const { password } = body;

  const user = await repo.findUserByPhones(buildPhoneLookupCandidates(phone, countryCode));
  if (!user) throw new AuthError('手机号或密码错误');

  let hash = user.password_hash;
  if (Buffer.isBuffer(hash)) hash = hash.toString('utf8');
  else if (hash != null && typeof hash !== 'string') hash = String(hash);
  if (typeof hash !== 'string' || !hash.trim()) {
    throw new AuthError('账号异常，请使用找回密码或联系客服');
  }

  let match = false;
  try {
    match = await comparePassword(password, hash);
  } catch (err) {
    console.error('[auth.login] bcrypt compare error', err);
    throw new AuthError('手机号或密码错误');
  }
  if (!match) throw new AuthError('手机号或密码错误');

  const uid = String(user.id ?? '');
  if (!uid) throw new AuthError('账号异常，请使用找回密码或联系客服');

  const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
  const token = signToken(uid, rv);
  return {
    data: {
      token,
      userId: uid,
      role: String(user.role || 'user'),
    },
    message: '登录成功',
  };
}

async function getProfile(userId) {
  const user = await repo.selectProfileFields(userId);
  if (!user) throw new NotFoundError('用户不存在');
  return { data: formatUserResponse(user, 'user') };
}

async function updateProfile(userId, body) {
  const { nickname, avatar, phone, countryCode, wechat, whatsapp } = body;
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
    const normalizedPhone = normalizeIntlPhone(phone, countryCode);
    if (!normalizedPhone) throw new ValidationError('手机号格式不正确');
    const dup = await repo.findPhoneDuplicateByPhones(
      userId,
      buildPhoneLookupCandidates(phone, countryCode),
    );
    if (dup) throw new ConflictError('该手机号已被其他用户使用');
    fragments.push('phone = ?');
    values.push(normalizedPhone);
  }
  if (wechat !== undefined) {
    fragments.push('wechat = ?');
    values.push(wechat);
  }
  if (whatsapp !== undefined) {
    fragments.push('whatsapp = ?');
    values.push(whatsapp);
  }

  if (fragments.length === 0) throw new ValidationError('没有需要更新的字段');

  await repo.updateUserProfile(userId, fragments, values);

  const user = await repo.selectProfileFields(userId);
  return { data: formatUserResponse(user, 'user'), message: '资料已更新' };
}

async function changePassword(userId, body) {
  const { oldPassword, newPassword } = body;

  const row = await repo.selectPasswordHash(userId);
  if (!row) throw new NotFoundError('用户不存在');

  let stored = row.password_hash;
  if (Buffer.isBuffer(stored)) stored = stored.toString('utf8');
  else if (stored != null && typeof stored !== 'string') stored = String(stored);
  if (typeof stored !== 'string' || !stored.trim()) {
    throw new ValidationError('账号异常，请联系客服');
  }

  const match = await comparePassword(oldPassword, stored);
  if (!match) throw new ValidationError('旧密码错误');

  const hash = await hashPassword(newPassword);
  await repo.updatePasswordHash(userId, hash);
  return { data: null, message: '密码已更新' };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new ValidationError('refreshToken 不能为空');

  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new AuthError('刷新令牌已过期');
  }

  if (payload.type !== 'refresh') throw new AuthError('无效的刷新令牌');

  const user = await repo.selectRefreshVersion(payload.userId);
  if (!user) throw new AuthError('用户不存在');

  const ver = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
  if (payload.rv === undefined) {
    if (ver !== 0) throw new AuthError('刷新令牌已失效，请重新登录');
  } else if (Number(payload.rv) !== ver) {
    throw new AuthError('刷新令牌已失效，请重新登录');
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

async function findUserByPhones(phones) {
  return repo.findUserByPhones(phones);
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
  findUserByPhones,
  bumpRefreshTokenVersion,
  updateLastLogin,
};

// 兼容历史：保留具名导出 BusinessError 以防有外部 require 该模块时使用
module.exports.BusinessError = BusinessError;
