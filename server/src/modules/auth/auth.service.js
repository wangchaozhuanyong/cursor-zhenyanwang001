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
const crypto = require('crypto');
const repo = require('./auth.repository');
const { formatUserResponse } = require('../../utils/formatUserResponse');
const { normalizeIntlPhone, buildPhoneLookupCandidates } = require('../../utils/phone');

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

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

  try {
    await repo.insertUser({
      id,
      phone: normalizedPhone,
      passwordHash: hash,
      nickname: nickname || '用户',
      inviteCode: code,
      parentInviteCode,
    });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
      throw new ConflictError('该手机号已注册');
    }
    throw err;
  }

  const autoPromoteFirstUser = process.env.AUTO_PROMOTE_FIRST_USER_TO_ADMIN === '1';
  if (autoPromoteFirstUser) {
    /** 仅显式开启时允许首个注册用户成为管理员，避免公网新实例被抢注接管。 */
    const userCount = await repo.countUsers();
    if (userCount === 1) {
      await repo.setUserRole(id, 'admin');
    }
  }

  const token = signToken(id, 0);
  return { data: { token, userId: id }, message: '注册成功' };
}

async function login(body) {
  const phone = body.phone || body.username;
  const countryCode = body.countryCode;
  const { password } = body;

  const lookupPhones = buildPhoneLookupCandidates(phone, countryCode);
  const matchedUsers = await repo.findUsersByPhones(lookupPhones);
  if (!matchedUsers.length) throw new AuthError('手机号或密码错误');

  function coerceHash(hash) {
    let h = hash;
    if (Buffer.isBuffer(h)) h = h.toString('utf8');
    else if (h != null && typeof h !== 'string') h = String(h);
    return typeof h === 'string' && h.trim() ? h : '';
  }

  let user = null;
  try {
    for (let i = 0; i < matchedUsers.length; i += 1) {
      const cand = matchedUsers[i];
      const stored = coerceHash(cand.password_hash);
      if (!stored) continue;
      if (await comparePassword(password, stored)) {
        user = cand;
        break;
      }
    }
  } catch (err) {
    console.error('[auth.login] bcrypt compare error', err);
    throw new AuthError('手机号或密码错误');
  }
  if (!user) throw new AuthError('手机号或密码错误');

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

async function requestPasswordReset(body) {
  const { phone, countryCode } = body;
  const lookupPhones = buildPhoneLookupCandidates(phone, countryCode);
  const user = await repo.findUserByPhones(lookupPhones);
  const generic = {
    data: null,
    message: '如果该手机号已注册，系统已生成密码重置指引，请按页面提示继续操作',
  };

  if (!user) return generic;

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await repo.deleteUnusedPasswordResetTokens(user.id);
  await repo.insertPasswordResetToken({
    id: generateId(),
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const exposeToken =
    process.env.NODE_ENV !== 'production'
    && String(process.env.EXPOSE_PASSWORD_RESET_TOKEN || '').toLowerCase() === 'true';

  return {
    data: exposeToken ? { resetToken: token, expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MINUTES } : null,
    message: exposeToken
      ? '重置令牌已生成（仅开发环境显示）'
      : generic.message,
  };
}

async function resetPassword(body) {
  const { token, newPassword } = body;
  const tokenHash = hashResetToken(token);
  const row = await repo.selectPasswordResetToken(tokenHash);
  if (!row) throw new ValidationError('重置令牌无效或已过期');
  if (row.used_at) throw new ValidationError('重置令牌已使用');
  if (new Date(row.expires_at).getTime() <= Date.now()) throw new ValidationError('重置令牌已过期');

  const hash = await hashPassword(newPassword);
  await repo.updatePasswordHash(row.user_id, hash);
  await repo.markPasswordResetTokenUsed(row.id);
  await repo.incrementRefreshTokenVersion(row.user_id);
  return { data: null, message: '密码已重置，请使用新密码登录' };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new ValidationError('refreshToken 不能为空');

  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new AuthError('刷新令牌已过期');
  }

  if (typeof payload === 'string') throw new AuthError('无效的刷新令牌');
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

async function findUsersByPhones(phones) {
  return repo.findUsersByPhones(phones);
}

/** 使该用户 refresh 令牌失效（与 logout 内逻辑一致） */
async function bumpRefreshTokenVersion(userId) {
  if (userId) await repo.incrementRefreshTokenVersion(userId);
}

async function updateLastLogin(userId) {
  await repo.updateLastLogin(userId);
}

/** 供管理端等域校验手机号是否已被其他用户占用 */
async function findPhoneDuplicateForUser(userId, phone) {
  return repo.findPhoneDuplicate(userId, phone);
}

/** 供管理端等域按兼容号码集合校验重复 */
async function findPhoneDuplicateByPhonesForUser(userId, phones) {
  return repo.findPhoneDuplicateByPhones(userId, phones);
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  refresh,
  logout,
  findUserByPhone,
  findUserByPhones,
  findUsersByPhones,
  bumpRefreshTokenVersion,
  updateLastLogin,
  findPhoneDuplicateForUser,
  findPhoneDuplicateByPhonesForUser,
};

// 兼容历史：保留具名导出 BusinessError 以防有外部 require 该模块时使用
module.exports.BusinessError = BusinessError;
