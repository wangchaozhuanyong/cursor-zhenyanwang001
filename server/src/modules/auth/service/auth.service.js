/**
 * Auth Service锛氭敞鍐屻€佺櫥褰曘€佸埛鏂颁护鐗屻€佺櫥鍑恒€佽祫鏂欍€佹敼瀵? *
 * 鍒嗗眰绾﹀畾锛? * - controller 浠呬紶鍏ャ€屽凡閫氳繃 schemas 鏍￠獙鐨?req.body / req.user銆? * - service 涓嶇洿鎺ユ嫾 SQL锛屾墍鏈?DB 璁块棶閫氳繃 `../repository/auth.repository`
 * - service 鎶?AppError 瀛愮被锛圔usinessError/NotFoundError/...锛夛紝鐢?errorHandler 缁熶竴鏄犲皠
 */
const {
  generateId,
  generateInviteCode,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
} = require('../../../utils/helpers');
const {
  BusinessError,
  AuthError,
  NotFoundError,
  ConflictError,
  ValidationError,
} = require('../../../errors');
const crypto = require('crypto');
const repo = require('../repository/auth.repository');
const wechatService = require('./wechat.service');
const { formatUserResponse } = require('../../../utils/formatUserResponse');
const { normalizeIntlPhone, buildPhoneLookupCandidates } = require('../../../utils/phone');
const { POINTS_ACTION } = require('../../../constants/pointsActions');

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;

function getAdminApi() {
  return /** @type {any} */ (require('../../admin')).api || {};
}

function getReqHeader(req, name) {
  if (!req) return '';
  if (typeof req.get === 'function') return req.get(name) || '';
  const headers = req.headers && typeof req.headers === 'object' ? req.headers : {};
  return headers[String(name).toLowerCase()] || headers[name] || '';
}

function getReqIp(req) {
  if (!req) return '';
  const xf = getReqHeader(req, 'x-forwarded-for');
  const raw = req.ip || (typeof xf === 'string' ? xf.split(',')[0].trim() : '') || req.socket?.remoteAddress || '';
  return String(raw || '').slice(0, 45);
}

function hashUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return null;
  return crypto.createHash('sha256').update(userAgent, 'utf8').digest('hex');
}

function buildLoginMeta(body = {}, req = null) {
  const userAgent = String(getReqHeader(req, 'user-agent') || body.userAgent || body.user_agent || '').slice(0, 500);
  const explicitDeviceId = String(
    body.deviceId
      || body.device_id
      || getReqHeader(req, 'x-device-id')
      || '',
  ).trim();
  return {
    ip: getReqIp(req) || body.ip || null,
    userAgent: userAgent || null,
    deviceId: explicitDeviceId || hashUserAgent(userAgent),
  };
}

async function safeIsIpBlocked(ip) {
  try {
    const fn = getAdminApi().isUserSecurityIpBlocked;
    return typeof fn === 'function' ? await fn(ip) : false;
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return false;
    throw err;
  }
}

async function safeIsDeviceBlocked(deviceId) {
  try {
    const fn = getAdminApi().isUserSecurityDeviceBlocked;
    return typeof fn === 'function' ? await fn(deviceId) : false;
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return false;
    throw err;
  }
}

async function safeRecordSecurityEvent(event) {
  try {
    const fn = getAdminApi().insertUserSecurityEvent;
    if (typeof fn !== 'function') return;
    await fn({
      id: generateId(),
      ...event,
    });
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return;
    throw err;
  }
}

async function assertLoginRiskAllowed({ userId, loginMethod, ip, deviceId, userAgent }) {
  if (ip && await safeIsIpBlocked(ip)) {
    await safeRecordSecurityEvent({
      userId,
      eventType: 'login_blocked_by_ip',
      severity: 'high',
      title: '登录被风险 IP 拦截',
      description: '该 IP 已被后台封禁',
      ip,
      deviceId,
      userAgent,
      metadata: { loginMethod },
    });
    throw new AuthError('当前登录 IP 已被限制，请联系客服');
  }
  if (deviceId && await safeIsDeviceBlocked(deviceId)) {
    await safeRecordSecurityEvent({
      userId,
      eventType: 'login_blocked_by_device',
      severity: 'high',
      title: '登录被风险设备拦截',
      description: '该设备已被后台封禁',
      ip,
      deviceId,
      userAgent,
      metadata: { loginMethod },
    });
    throw new AuthError('当前登录设备已被限制，请联系客服');
  }
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function register(body) {
  const { phone, countryCode, password, nickname, inviteCode } = body;
  const normalizedPhone = normalizeIntlPhone(phone, countryCode);
  if (!normalizedPhone) throw new ValidationError('手机号格式不正确');

  const existing = await repo.findUserIdByPhones(buildPhoneLookupCandidates(phone, countryCode));
  if (existing) throw new ConflictError('该手机号已注册，请直接登录');
  const parentInviteCode = String(inviteCode || '').trim().toUpperCase();
  if (parentInviteCode) {
    const inviter = await repo.selectUserIdByInviteCode(parentInviteCode);
    if (!inviter) throw new ValidationError('邀请码不存在或不可用');
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
      throw new ConflictError('该手机号已注册，请直接登录');
    }
    throw err;
  }

  const autoPromoteFirstUser = process.env.AUTO_PROMOTE_FIRST_USER_TO_ADMIN === '1';
  if (autoPromoteFirstUser) {
    /** 浠呮樉寮忓紑鍚椂鍏佽棣栦釜娉ㄥ唽鐢ㄦ埛鎴愪负绠＄悊鍛橈紝閬垮厤鍏綉鏂板疄渚嬭鎶㈡敞鎺ョ銆?*/
    const userCount = await repo.countUsers();
    if (userCount === 1) {
      await repo.setUserRole(id, 'admin');
    }
  }

  try {
    const userApi = /** @type {any} */ (require('../../user')).api || {};
    if (typeof userApi.awardConfiguredPointsBonusForUser === 'function') {
      await userApi.awardConfiguredPointsBonusForUser({
        userId: id,
        action: POINTS_ACTION.REGISTER,
        description: '注册奖励',
        sourceType: 'register',
        relatedRecordId: `register:${id}`,
      });
    }
  } catch (e) {
    console.warn(`[auth.register] register points issue skipped: ${e?.message || e}`);
  }

  try {
    const marketingApi = /** @type {any} */ (require('../../marketing')).api || {};
    if (typeof marketingApi.issueNewUserGiftPack === 'function') {
      await marketingApi.issueNewUserGiftPack(id);
    }
  } catch (e) {
    console.warn(`[auth.register] new user gift issue skipped: ${e?.message || e}`);
  }

  const token = signToken(id, 0);
  return { data: { token, userId: id }, message: '注册成功' };
}

async function login(body, req) {
  const phone = body.phone || body.username;
  const countryCode = body.countryCode;
  const { password } = body;

  const lookupPhones = buildPhoneLookupCandidates(phone, countryCode);
  const matchedUsers = await repo.findUsersByPhones(lookupPhones);
  if (!matchedUsers.length) throw new AuthError('手机号或密码不正确');

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
    throw new AuthError('手机号或密码不正确');
  }
  if (!user) throw new AuthError('手机号或密码不正确');

  return issueLoginForUserId(user.id, {
    loginMethod: 'phone_password',
    ...buildLoginMeta(body, req),
  });
}

function buildLoginResult(userRow) {
  const uid = String(userRow.id ?? '');
  if (!uid) throw new AuthError('登录状态无效，请重新登录');

  const rv = Number.isFinite(Number(userRow.refresh_token_version))
    ? Number(userRow.refresh_token_version)
    : 0;
  const token = signToken(uid, rv);
  if (userRow.account_status === 'disabled' || userRow.account_status === 'blacklisted') {
    throw new AuthError('账号已被限制使用，请联系客服');
  }
  return {
    data: {
      token,
      userId: uid,
      role: String(userRow.role || 'user'),
    },
    message: '登录成功',
  };
}

async function issueLoginForUserId(userId, options = {}) {
  const row = await repo.selectRefreshVersion(userId);
  if (!row) throw new AuthError('登录状态无效，请重新登录');

  const loginMethod = options.loginMethod;
  if (loginMethod) {
    const uaHash = hashUserAgent(options.userAgent);
    const deviceId = options.deviceId || uaHash;
    await assertLoginRiskAllowed({
      userId,
      loginMethod,
      ip: options.ip || null,
      deviceId,
      userAgent: options.userAgent || null,
    });
    await repo.updateLastLogin(userId);
    await repo.insertLoginAudit({
      id: generateId(),
      userId,
      loginMethod,
      ip: options.ip || null,
      uaHash,
    });
  } else {
    await repo.updateLastLogin(userId);
  }

  return buildLoginResult(row);
}

async function getProfile(userId) {
  const user = await repo.selectProfileFields(userId);
  if (!user) throw new NotFoundError('资源不存在');
  const wechatLogin = await wechatService.getWechatBindingForProfile(userId);
  return {
    data: formatUserResponse({
      ...user,
      wechat_login: wechatLogin,
      wechatLoginEnabled: wechatService.isWechatLoginEnabled(),
    }, 'user'),
  };
}

function normalizeBirthdayInput(value) {
  if (value === null || value === '') return null;
  const s = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ValidationError('生日格式应为 YYYY-MM-DD');
  return s;
}

function normalizeStoredBirthday(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

async function updateProfile(userId, body) {
  const {
    nickname,
    avatar,
    phone,
    countryCode,
    wechat,
    whatsapp,
    whatsappCountryCode,
    birthday,
  } = body;
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
    if (dup) throw new ConflictError('该手机号已注册，请更换手机号');
    fragments.push('phone = ?');
    values.push(normalizedPhone);
  }
  if (wechat !== undefined) {
    fragments.push('wechat = ?');
    values.push(wechat);
  }
  if (whatsapp !== undefined) {
    const normalizedWhatsapp = String(whatsapp || '').trim()
      ? normalizeIntlPhone(whatsapp, whatsappCountryCode)
      : '';
    if (String(whatsapp || '').trim() && !normalizedWhatsapp) {
      throw new ValidationError('WhatsApp 号码格式不正确');
    }
    fragments.push('whatsapp = ?');
    values.push(normalizedWhatsapp);
  }
  let didUpdateBirthday = false;
  if (birthday !== undefined) {
    const normalizedBirthday = normalizeBirthdayInput(birthday);
    const existing = await repo.selectUserBirthdayFields(userId);
    const existingBirthday = normalizeStoredBirthday(existing?.birthday);
    const birthdayLocked = !!existingBirthday && !!existing?.birthday_locked;
    if (birthdayLocked) {
      throw new ValidationError('生日已锁定，请联系客服修改');
    }
    if (existingBirthday && normalizedBirthday !== existingBirthday) {
      throw new ValidationError('生日仅可设置一次，如需修改请联系客服');
    }
    if (existingBirthday && normalizedBirthday === existingBirthday) {
      // 已存在相同生日时视为无变更，避免重复写入或误清空。
    } else if (normalizedBirthday) {
      await repo.updateUserBirthday(userId, {
        birthday: normalizedBirthday,
        birthdayLocked: true,
        birthdayUpdatedAt: new Date(),
      });
      didUpdateBirthday = true;
    }
  }

  if (fragments.length === 0 && !didUpdateBirthday) throw new ValidationError('没有需要更新的字段');

  if (fragments.length > 0) {
    await repo.updateUserProfile(userId, fragments, values);
  }

  const user = await repo.selectProfileFields(userId);
  return { data: formatUserResponse(user, 'user'), message: '资料已更新' };
}

async function changePassword(userId, body) {
  const { oldPassword, newPassword } = body;

  const row = await repo.selectPasswordHash(userId);
  if (!row) throw new NotFoundError('资源不存在');

  let stored = row.password_hash;
  if (Buffer.isBuffer(stored)) stored = stored.toString('utf8');
  else if (stored != null && typeof stored !== 'string') stored = String(stored);
  if (typeof stored !== 'string' || !stored.trim()) {
    throw new ValidationError('当前账号暂未设置密码');
  }

  const match = await comparePassword(oldPassword, stored);
  if (!match) throw new ValidationError('旧密码不正确');

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
    message: '若该手机号已注册，我们将处理您的重置请求',
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
      ? '开发环境已返回重置令牌'
      : generic.message,
  };
}

async function resetPassword(body) {
  const { token, newPassword } = body;
  const tokenHash = hashResetToken(token);
  const row = await repo.selectPasswordResetToken(tokenHash);
  if (!row) throw new ValidationError('重置令牌无效，请重新申请');
  if (row.used_at) throw new ValidationError('重置令牌已使用，请重新申请');
  if (new Date(row.expires_at).getTime() <= Date.now()) throw new ValidationError('重置令牌已过期，请重新申请');

  const hash = await hashPassword(newPassword);
  await repo.updatePasswordHash(row.user_id, hash);
  await repo.markPasswordResetTokenUsed(row.id);
  await repo.incrementRefreshTokenVersion(row.user_id);
  return { data: null, message: '密码已重置' };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new ValidationError('登录状态无效，请重新登录');

  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new AuthError('登录状态无效，请重新登录');
  }

  if (typeof payload === 'string') throw new AuthError('登录状态无效，请重新登录');
  if (payload.type !== 'refresh') throw new AuthError('登录状态无效，请重新登录');

  const user = await repo.selectRefreshVersion(payload.userId);
  if (!user) throw new AuthError('登录状态无效，请重新登录');

  const ver = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
  if (payload.rv === undefined) {
    if (ver !== 0) throw new AuthError('登录状态无效，请重新登录');
  } else if (Number(payload.rv) !== ver) {
    throw new AuthError('登录状态无效，请重新登录');
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

/** 渚涘叾浠栧煙锛堝 admin锛夊湪璁よ瘉娴佺▼涓煡璇㈢敤鎴凤紝涓嶇粡杩?HTTP */
async function findUserByPhone(phone) {
  return repo.findUserByPhone(phone);
}

async function findUserByPhones(phones) {
  return repo.findUserByPhones(phones);
}

async function findUsersByPhones(phones) {
  return repo.findUsersByPhones(phones);
}

/** 浣胯鐢ㄦ埛 refresh 浠ょ墝澶辨晥锛堜笌 logout 鍐呴€昏緫涓€鑷达級 */
async function bumpRefreshTokenVersion(userId) {
  if (userId) await repo.incrementRefreshTokenVersion(userId);
}

async function updateLastLogin(userId) {
  await repo.updateLastLogin(userId);
}

/** 渚涚鐞嗙绛夊煙鏍￠獙鎵嬫満鍙锋槸鍚﹀凡琚叾浠栫敤鎴峰崰鐢?*/
async function findPhoneDuplicateForUser(userId, phone) {
  return repo.findPhoneDuplicate(userId, phone);
}

/** 渚涚鐞嗙绛夊煙鎸夊吋瀹瑰彿鐮侀泦鍚堟牎楠岄噸澶?*/
async function findPhoneDuplicateByPhonesForUser(userId, phones) {
  return repo.findPhoneDuplicateByPhones(userId, phones);
}

async function getUserIdAndRole(userId) {
  return repo.selectIdAndRoleByUserId(userId);
}

module.exports = {
  register,
  login,
  buildLoginResult,
  issueLoginForUserId,
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
  getUserIdAndRole,
};

// 鍏煎鍘嗗彶锛氫繚鐣欏叿鍚嶅鍑?BusinessError 浠ラ槻鏈夊閮?require 璇ユā鍧楁椂浣跨敤
module.exports.BusinessError = BusinessError;
