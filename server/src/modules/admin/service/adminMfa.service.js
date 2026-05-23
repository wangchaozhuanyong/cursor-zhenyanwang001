const crypto = require('crypto');
const { BusinessError } = require('../../../errors/BusinessError');
const { generateId, signToken } = require('../../../utils/helpers');
const { randomBase32, verifyTotp, buildOtpAuthUrl } = require('../../../utils/totp');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/adminMfa.repository');
const rbacService = require('./rbac.service');

const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MFA_RECENT_WINDOW_MS = Number(process.env.ADMIN_MFA_RECENT_MINUTES || 10) * 60 * 1000;
const ADMIN_ACCESS_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '15m';
const ADMIN_ACCESS_EXPIRES_SECONDS = Number(process.env.ADMIN_JWT_EXPIRES_SECONDS || 15 * 60);
const TRUSTED_DEVICE_DAYS = Number(process.env.ADMIN_TRUSTED_DEVICE_DAYS || 30);
const challenges = new Map();

function getEncryptionKey() {
  const seed = process.env.ADMIN_MFA_SECRET_KEY || process.env.JWT_SECRET || 'dev-admin-mfa-secret';
  if (process.env.NODE_ENV === 'production' && (!seed || seed === 'dev-admin-mfa-secret')) {
    throw new Error('ADMIN_MFA_SECRET_KEY or JWT_SECRET is required for admin MFA in production');
  }
  return crypto.createHash('sha256').update(seed).digest();
}

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptSecret(value) {
  const [version, ivRaw, tagRaw, encryptedRaw] = String(value || '').split(':');
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) return '';
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function parseCookies(req) {
  const header = req?.headers?.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function getDeviceId(req) {
  return parseCookies(req).admin_device_id || '';
}

function setTrustedDeviceCookie(req, res, deviceId) {
  const secure = process.env.NODE_ENV === 'production'
    || req.secure
    || req.protocol === 'https'
    || req.get('x-forwarded-proto') === 'https';
  res.cookie('admin_device_id', deviceId, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/admin',
  });
}

function putChallenge(payload) {
  const ticket = crypto.randomBytes(32).toString('base64url');
  challenges.set(ticket, {
    ...payload,
    expiresAt: Date.now() + MFA_CHALLENGE_TTL_MS,
  });
  return ticket;
}

function takeChallenge(ticket) {
  const challenge = challenges.get(ticket);
  challenges.delete(ticket);
  if (!challenge || challenge.expiresAt < Date.now()) {
    throw new BusinessError(401, '多因素验证已过期，请重新登录');
  }
  return challenge;
}

async function getStatus(userId) {
  const settings = await repo.selectMfaSettings(userId);
  return {
    enabled: Boolean(settings?.enabled),
    required: Boolean(settings?.required),
    lastVerifiedAt: settings?.last_verified_at || null,
  };
}

/** 若最近仍在 MFA 有效期内，返回可用于 JWT 的 unix 秒时间戳 */
async function resolveRecentMfaVerifiedAt(userId) {
  const settings = await repo.selectMfaSettings(userId);
  if (!settings?.enabled || !settings.last_verified_at) return 0;
  const verifiedMs = new Date(settings.last_verified_at).getTime();
  if (!Number.isFinite(verifiedMs) || Date.now() - verifiedMs > MFA_RECENT_WINDOW_MS) return 0;
  return Math.floor(verifiedMs / 1000);
}

async function isTrustedDevice(userId, req) {
  const deviceId = getDeviceId(req);
  if (!deviceId) return false;
  const row = await repo.selectTrustedDevice(userId, hashValue(deviceId));
  return Boolean(row);
}

async function buildLoginMfaChallenge(user, req) {
  const settings = await repo.selectMfaSettings(user.id);
  const enabled = Boolean(settings?.enabled);

  if (enabled && await isTrustedDevice(user.id, req)) return null;

  if (enabled) {
    return {
      data: {
        mfaRequired: true,
        mfaTicket: putChallenge({ userId: user.id, purpose: 'login' }),
      },
      message: '需要多因素身份验证',
    };
  }

  if (user.role === 'super_admin' || settings?.required) {
    const secret = randomBase32();
    const issuer = process.env.ADMIN_MFA_ISSUER || 'Admin Console';
    await repo.upsertPendingMfaSettings(user.id, encryptSecret(secret));
    return {
      data: {
        mfaSetupRequired: true,
        mfaTicket: putChallenge({ userId: user.id, purpose: 'setup' }),
        secret,
        otpAuthUrl: buildOtpAuthUrl({
          issuer,
          account: user.phone || user.nickname || user.id,
          secret,
        }),
      },
      message: '请先完成多因素身份验证绑定',
    };
  }

  return null;
}

async function issueAdminSession(user, req, mfaVerifiedAt = 0) {
  const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
  const token = signToken(user.id, rv, {
    accessExpiresIn: ADMIN_ACCESS_EXPIRES_IN,
    expiresInSeconds: ADMIN_ACCESS_EXPIRES_SECONDS,
    accessPayload: mfaVerifiedAt ? { mfaVerifiedAt } : {},
  });
  const access = await rbacService.getAccessContext(user.id, user.role);
  await repo.touchMfaVerified(user.id).catch(() => {});
  await writeAuditLog({
    req,
    operatorId: user.id,
    operatorName: user.nickname || user.phone || '',
    operatorRole: user.role,
    actionType: 'admin.mfa.verify',
    objectType: 'auth',
    objectId: user.id,
    summary: 'admin MFA verified',
    result: 'success',
  });
  return {
    token,
    userId: user.id,
    role: String(user.role || ''),
    permissions: access.permissions,
    isSuperAdmin: access.isSuperAdmin,
    roleCodes: access.roleCodes,
    mfaVerifiedAt,
  };
}

async function verifyChallenge(body, req, res) {
  const ticket = String(body?.mfaTicket || '');
  const code = String(body?.code || '');
  const challenge = takeChallenge(ticket);
  const user = await repo.selectUserForMfa(challenge.userId);
  if (!user) throw new BusinessError(401, '多因素验证会话无效，请重新登录');
  if (user.account_status === 'disabled' || user.account_status === 'blacklisted') {
    throw new BusinessError(403, '管理员账号已停用');
  }

  const settings = await repo.selectMfaSettings(user.id);
  const secret = decryptSecret(settings?.totp_secret_enc);
  if (!secret || !verifyTotp(secret, code)) {
    await writeAuditLog({
      req,
      operatorId: user.id,
      operatorName: user.nickname || user.phone || '',
      operatorRole: user.role,
      actionType: 'admin.mfa.verify',
      objectType: 'auth',
      objectId: user.id,
      summary: 'admin MFA verify failed',
      result: 'failure',
      errorMessage: 'TOTP_INVALID',
    });
    throw new BusinessError(401, '验证码不正确或已过期');
  }

  if (challenge.purpose === 'setup') {
    await repo.enableMfa(user.id, settings.totp_secret_enc);
  }

  const deviceId = getDeviceId(req) || crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000);
  await repo.upsertTrustedDevice({
    id: generateId(),
    userId: user.id,
    deviceHash: hashValue(deviceId),
    userAgentHash: hashValue(req.get('user-agent') || ''),
    expiresAt: expires,
  });
  setTrustedDeviceCookie(req, res, deviceId);

  return {
    data: await issueAdminSession(user, req, Math.floor(Date.now() / 1000)),
    message: '多因素验证成功',
  };
}

async function verifyReverify(body, req) {
  const userId = req.user?.id;
  if (!userId) throw new BusinessError(401, '请先登录');

  const settings = await repo.selectMfaSettings(userId);
  const secret = decryptSecret(settings?.totp_secret_enc);
  if (!settings?.enabled || !secret) {
    throw new BusinessError(403, '请先完成多因素身份验证绑定');
  }

  const code = String(body?.code || '');
  if (!verifyTotp(secret, code)) {
    await writeAuditLog({
      req,
      operatorId: userId,
      operatorName: req.user?.nickname || req.user?.phone || '',
      operatorRole: req.user?.role || '',
      actionType: 'admin.mfa.reverify',
      objectType: 'auth',
      objectId: userId,
      summary: 'admin MFA reverify failed',
      result: 'failure',
      errorMessage: 'TOTP_INVALID',
    });
    throw new BusinessError(401, '验证码不正确或已过期');
  }

  await repo.touchMfaVerified(userId);
  const user = await repo.selectUserForMfa(userId);
  if (!user) throw new BusinessError(401, '用户不存在');

  const mfaVerifiedAt = Math.floor(Date.now() / 1000);
  const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
  const token = signToken(user.id, rv, {
    accessExpiresIn: ADMIN_ACCESS_EXPIRES_IN,
    expiresInSeconds: ADMIN_ACCESS_EXPIRES_SECONDS,
    accessPayload: { mfaVerifiedAt },
  });

  await writeAuditLog({
    req,
    operatorId: userId,
    operatorName: user.nickname || user.phone || '',
    operatorRole: user.role,
    actionType: 'admin.mfa.reverify',
    objectType: 'auth',
    objectId: userId,
    summary: 'admin MFA reverify success',
    result: 'success',
  });

  return {
    data: {
      token,
      mfaVerifiedAt,
      userId: user.id,
      role: String(user.role || ''),
    },
    message: '多因素验证成功',
  };
}

function mfaRequiredResponse(res, message) {
  return res.status(403).json({ code: 403, message, data: { mfaRequired: true } });
}

async function userMustStepUpMfa(user) {
  const settings = await repo.selectMfaSettings(user.id);
  const enabled = Boolean(settings?.enabled);
  const required = user.role === 'super_admin' || Boolean(settings?.required);
  if (!enabled && !required) return false;
  return true;
}

function requireRecentMfa(req, res, next) {
  (async () => {
    if (!req.user) return res.fail(401, '请先登录');
    const mustVerify = await userMustStepUpMfa(req.user);
    if (!mustVerify) return next();

    if (!req.user.mfaVerifiedAt) {
      return mfaRequiredResponse(res, '需要多因素身份验证');
    }
    const verifiedMs = Number(req.user.mfaVerifiedAt) * 1000;
    if (!Number.isFinite(verifiedMs) || Date.now() - verifiedMs > MFA_RECENT_WINDOW_MS) {
      return mfaRequiredResponse(res, '多因素验证已过期，请重新验证');
    }
    return next();
  })().catch(next);
}

module.exports = {
  getStatus,
  resolveRecentMfaVerifiedAt,
  buildLoginMfaChallenge,
  verifyChallenge,
  verifyReverify,
  requireRecentMfa,
};
