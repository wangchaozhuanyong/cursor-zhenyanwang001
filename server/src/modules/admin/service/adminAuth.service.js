const { BusinessError } = require('../../../errors/BusinessError');
const { AuthError } = require('../../../errors');
const crypto = require('crypto');
const { comparePassword, signToken, verifyToken } = require('../../../utils/helpers');
const { writeAuditLog } = require('../../../utils/auditLog');
const rbacService = require('./rbac.service');
const adminMfaService = require('./adminMfa.service');
const { buildPhoneLookupCandidates, inferCountryCodeForPhone } = require('../../../utils/phone');
const { sortUsersForAdminLogin } = require('./rbac.service');

const PUBLIC_LOGIN_FAILURE_MESSAGE = '账号或密码错误';
/** 仅当服务端配置了 Turnstile 且登录页可提交 token 时才启用验证码门槛 */
const ADMIN_CAPTCHA_CONFIGURED = Boolean(
  process.env.ADMIN_TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY,
);
const CAPTCHA_FAILURE_THRESHOLD = ADMIN_CAPTCHA_CONFIGURED
  ? Number(process.env.ADMIN_LOGIN_CAPTCHA_FAILURES || 3)
  : 0;
const LOCK_FAILURE_THRESHOLD = Number(process.env.ADMIN_LOGIN_LOCK_FAILURES || 10);
const SKIP_LOGIN_RISK_INCREMENT = new Set([
  'ACCOUNT_LOCKED',
  'CAPTCHA_REQUIRED',
  'MISSING_CREDENTIALS',
]);
const LOCK_MS = Number(process.env.ADMIN_LOGIN_LOCK_MINUTES || 30) * 60 * 1000;
const loginRiskState = new Map();
const ADMIN_ACCESS_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '15m';
const ADMIN_ACCESS_EXPIRES_SECONDS = Number(process.env.ADMIN_JWT_EXPIRES_SECONDS || 15 * 60);

function requireAuthApi(name) {
  const authApi = /** @type {any} */ (require('../../auth')).api || {};
  const fn = authApi[name];
  if (typeof fn !== 'function') {
    throw new Error(`Auth module API is missing method: ${name}`);
  }
  return fn;
}

function normalizeLoginAccount(input) {
  return String(input || '')
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, '')
    .trim();
}

function getClientIp(req) {
  const xf = req?.headers?.['x-forwarded-for'];
  return String(req?.ip || (typeof xf === 'string' ? xf.split(',')[0].trim() : '') || req?.socket?.remoteAddress || 'unknown');
}

function riskKey(scope, value) {
  return `${scope}:${String(value || 'unknown').toLowerCase()}`;
}

function getRiskRecord(key) {
  const now = Date.now();
  const record = loginRiskState.get(key);
  if (!record || (record.lockedUntil && record.lockedUntil <= now)) {
    const fresh = { failures: 0, lockedUntil: 0, lastFailureAt: 0 };
    loginRiskState.set(key, fresh);
    return fresh;
  }
  return record;
}

function getRiskKeys(phone, req) {
  const ip = getClientIp(req);
  return [
    riskKey('ip', ip),
    riskKey('account', phone),
    riskKey('combo', `${ip}|${phone}`),
  ];
}

function getMaxFailures(keys) {
  return Math.max(...keys.map((key) => getRiskRecord(key).failures), 0);
}

function decorateLoginError(err, reason) {
  err.auditReason = reason;
  return err;
}

function assertLoginRiskAllowed(phone, body, req) {
  const keys = getRiskKeys(phone, req);
  const now = Date.now();
  const locked = keys.find((key) => {
    const record = getRiskRecord(key);
    return record.lockedUntil && record.lockedUntil > now;
  });
  if (locked) {
    throw decorateLoginError(new BusinessError(423, PUBLIC_LOGIN_FAILURE_MESSAGE), 'ACCOUNT_LOCKED');
  }

  const hasCaptcha = Boolean(body?.captchaToken || body?.turnstileToken);
  if (ADMIN_CAPTCHA_CONFIGURED && CAPTCHA_FAILURE_THRESHOLD > 0 && getMaxFailures(keys) >= CAPTCHA_FAILURE_THRESHOLD && !hasCaptcha) {
    throw decorateLoginError(new BusinessError(401, PUBLIC_LOGIN_FAILURE_MESSAGE), 'CAPTCHA_REQUIRED');
  }
}

function recordLoginFailure(phone, req) {
  const now = Date.now();
  for (const key of getRiskKeys(phone, req)) {
    const record = getRiskRecord(key);
    record.failures += 1;
    record.lastFailureAt = now;
    if (record.failures >= LOCK_FAILURE_THRESHOLD) {
      record.lockedUntil = now + LOCK_MS;
    }
    loginRiskState.set(key, record);
  }
}

function clearLoginFailures(phone, req) {
  for (const key of getRiskKeys(phone, req)) {
    loginRiskState.delete(key);
  }
}

function coerceHash(hash) {
  let h = hash;
  if (Buffer.isBuffer(h)) h = h.toString('utf8');
  else if (h != null && typeof h !== 'string') h = String(h);
  return typeof h === 'string' && h.trim() ? h : '';
}

async function login(body, req) {
  const phone = normalizeLoginAccount(body.phone || body.username);
  const countryCode = body.countryCode || inferCountryCodeForPhone(phone);
  const password = String(body.password || '');
  try {
    if (!phone || !password) {
      throw decorateLoginError(new BusinessError(400, PUBLIC_LOGIN_FAILURE_MESSAGE), 'MISSING_CREDENTIALS');
    }
    assertLoginRiskAllowed(phone, body, req);

    const matchedUsers = sortUsersForAdminLogin(
      await requireAuthApi('findUsersByPhones')(buildPhoneLookupCandidates(phone, countryCode)),
    );
    const adminCandidates = matchedUsers.filter(
      (cand) => cand.role === 'admin' || cand.role === 'super_admin',
    );
    if (!adminCandidates.length) {
      throw decorateLoginError(
        new BusinessError(401, PUBLIC_LOGIN_FAILURE_MESSAGE),
        matchedUsers.length ? 'NOT_ADMIN' : 'ADMIN_NOT_FOUND',
      );
    }

    let user = null;
    try {
      for (let i = 0; i < adminCandidates.length; i += 1) {
        const cand = adminCandidates[i];
        const stored = coerceHash(cand.password_hash);
        if (!stored) continue;
        if (await comparePassword(password, stored)) {
          user = cand;
          break;
        }
      }
    } catch (e) {
      console.error('[adminAuth.login] bcrypt compare error', e);
      user = null;
    }
    if (!user) {
      throw decorateLoginError(new BusinessError(401, PUBLIC_LOGIN_FAILURE_MESSAGE), 'PASSWORD_WRONG');
    }
    if (user.account_status === 'disabled' || user.account_status === 'blacklisted') {
      throw decorateLoginError(new BusinessError(403, PUBLIC_LOGIN_FAILURE_MESSAGE), 'ADMIN_DISABLED');
    }

    const uid = String(user.id ?? '');
    if (!uid) {
      throw decorateLoginError(new BusinessError(401, PUBLIC_LOGIN_FAILURE_MESSAGE), 'ADMIN_ID_MISSING');
    }

    const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
    const mfaChallenge = await adminMfaService.buildLoginMfaChallenge({
      id: uid,
      phone: user.phone || phone,
      nickname: user.nickname || '',
      role: user.role,
      refresh_token_version: rv,
    }, req);
    if (mfaChallenge) {
      await writeAuditLog({
        req,
        operatorId: uid,
        operatorName: user.nickname || phone,
        operatorRole: user.role,
        actionType: 'admin.mfa.challenge',
        objectType: 'auth',
        objectId: uid,
        summary: mfaChallenge.data?.mfaSetupRequired ? 'admin MFA setup required' : 'admin MFA login required',
        result: 'success',
      });
      return mfaChallenge;
    }

    const mfaContext = await adminMfaService.resolveLoginMfaContext({
      id: uid,
      role: user.role,
    }, req);
    const adminSessionId = crypto.randomBytes(18).toString('base64url');
    const token = signToken(uid, rv, {
      accessExpiresIn: ADMIN_ACCESS_EXPIRES_IN,
      expiresInSeconds: ADMIN_ACCESS_EXPIRES_SECONDS,
      accessPayload: {
        adminSessionId,
        ...(mfaContext.mfaVerifiedAt ? {
          mfaVerifiedAt: mfaContext.mfaVerifiedAt,
          mfaMethod: mfaContext.mfaMethod,
        } : {}),
      },
      refreshPayload: { adminSessionId },
    });
    const access = await rbacService.getAccessContext(uid, user.role);
    try { await requireAuthApi('updateLastLogin')(uid); } catch { /* non-critical */ }
    clearLoginFailures(phone, req);
    await writeAuditLog({
      req,
      operatorId: uid,
      operatorName: user.nickname || phone,
      operatorRole: user.role,
      actionType: 'admin.login',
      objectType: 'auth',
      objectId: uid,
      summary: 'admin login success',
      result: 'success',
    });
    return {
      data: {
        token,
        userId: uid,
        role: String(user.role || ''),
        permissions: access.permissions,
        isSuperAdmin: access.isSuperAdmin,
        roleCodes: access.roleCodes,
        adminSessionId,
        mfaVerifiedAt: mfaContext.mfaVerifiedAt,
        mfaMethod: mfaContext.mfaMethod,
      },
      message: '登录成功',
    };
  } catch (err) {
    if (!SKIP_LOGIN_RISK_INCREMENT.has(err.auditReason)) {
      recordLoginFailure(phone, req);
    }
    await writeAuditLog({
      req,
      operatorId: null,
      operatorName: phone || '',
      operatorRole: '',
      actionType: 'admin.login',
      objectType: 'auth',
      objectId: null,
      summary: 'admin login failure',
      result: 'failure',
      errorMessage: err.auditReason || err.message || String(err),
    });
    throw err;
  }
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new BusinessError(401, '请先登录');
  let payload;
  try {
    payload = /** @type {{ type?: string, userId?: string, rv?: number, adminSessionId?: string }} */ (verifyToken(refreshToken));
  } catch {
    throw new BusinessError(401, '登录已过期，请重新登录');
  }
  if (payload.type !== 'refresh') throw new BusinessError(401, '登录已过期，请重新登录');

  const user = await requireAuthApi('getUserIdAndRole')(payload.userId);
  if (!user) throw new BusinessError(401, '用户不存在');
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new BusinessError(403, '无管理员权限');
  }
  if (user.account_status === 'disabled' || user.account_status === 'blacklisted') {
    throw new BusinessError(403, '管理员账号已停用');
  }

  try {
    await requireAuthApi('refresh')(refreshToken);
    const rv = Number.isFinite(Number(payload.rv)) ? Number(payload.rv) + 1 : 1;
    await requireAuthApi('bumpRefreshTokenVersion')(payload.userId);
    const adminSessionId = String(payload.adminSessionId || '') || crypto.randomBytes(18).toString('base64url');
    const token = signToken(payload.userId, rv, {
      accessExpiresIn: ADMIN_ACCESS_EXPIRES_IN,
      expiresInSeconds: ADMIN_ACCESS_EXPIRES_SECONDS,
      accessPayload: { adminSessionId },
      refreshPayload: { adminSessionId },
    });
    return {
      data: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresIn: token.expiresIn,
        mfaVerifiedAt: 0,
      },
    };
  } catch (err) {
    if (err instanceof AuthError) throw new BusinessError(401, err.message || '登录已过期，请重新登录');
    throw err;
  }
}

async function logout(userId, req) {
  if (userId) {
    await requireAuthApi('bumpRefreshTokenVersion')(userId);
  }
  await writeAuditLog({
    req,
    operatorId: userId || null,
    actionType: 'admin.logout',
    objectType: 'auth',
    objectId: userId || null,
    summary: 'admin logout',
    result: 'success',
  });
  return { data: null, message: '已退出登录' };
}

module.exports = { login, refresh, logout };
