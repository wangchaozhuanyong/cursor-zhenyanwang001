// @ts-nocheck
const crypto = require('crypto');
const { generateId, signToken } = require('../../../utils/helpers');
const { AuthError, RateLimitError, ValidationError } = require('../../../errors');
const { getRedisClient, getRedisKeyPrefix } = require('../../../config/redis');
const repo = require('../repository/clientSecurity.repository');

const LOGIN_ERROR = '账号或密码错误';
const FREQUENCY_ERROR = '登录请求过于频繁，请稍后再试';
const CHALLENGE_TTL_SECONDS = 120;
const REFRESH_TTL_DAYS = 30;
const COMMON_WEAK_PASSWORDS = new Set(['12345678', 'password', 'password123', 'qwerty123', 'admin123']);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function redisKey(key) {
  const prefix = getRedisKeyPrefix();
  return prefix ? `${prefix}:${key}` : key;
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function requireDeviceId(deviceId) {
  const normalized = String(deviceId || '').trim();
  if (!normalized || normalized.length < 8 || normalized.length > 128) {
    throw new ValidationError('设备标识无效，请刷新页面后重试');
  }
  return normalized;
}

function getIp(req) {
  const xf = req?.headers?.['x-forwarded-for'];
  return String(req?.ip || (typeof xf === 'string' ? xf.split(',')[0].trim() : '') || req?.socket?.remoteAddress || '').slice(0, 45);
}

function buildContext(req, body = {}) {
  const headers = req?.headers || {};
  const deviceId = body.deviceId || body.device_id || headers['x-device-id'] || '';
  const userAgent = String(headers['user-agent'] || '').slice(0, 500);
  return {
    ip: getIp(req),
    deviceId: String(deviceId || '').trim().slice(0, 128),
    userAgent,
    language: String(headers['accept-language'] || '').slice(0, 120),
    timezone: String(body.timezone || body.timeZone || headers['x-timezone'] || '').slice(0, 64),
    accept: String(headers.accept || '').slice(0, 120),
    secFetchSite: String(headers['sec-fetch-site'] || '').slice(0, 64),
  };
}

function deviceFingerprint(context) {
  return sha256([
    context.deviceId || '',
    context.userAgent || '',
    context.ip || '',
    context.language || '',
    context.timezone || '',
  ].join('|'));
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

async function createLoginChallenge() {
  const token = randomToken(32);
  const redis = getRedisClient();
  await redis.set(redisKey(`security:challenge:${token}`), '1', 'EX', CHALLENGE_TTL_SECONDS, 'NX');
  return { token, expiresInSeconds: CHALLENGE_TTL_SECONDS };
}

async function consumeLoginChallenge(token) {
  const normalized = String(token || '').trim();
  if (!normalized) throw new RateLimitError(FREQUENCY_ERROR);
  const redis = getRedisClient();
  const key = redisKey(`security:challenge:${normalized}`);
  const consumed = await redis.eval(
    "local v = redis.call('GET', KEYS[1]); if v then redis.call('DEL', KEYS[1]); return v; end; return nil;",
    1,
    key,
  );
  if (!consumed) throw new RateLimitError(FREQUENCY_ERROR);
}

async function incrWithTtl(redis, key, ttlSeconds) {
  const fullKey = redisKey(key);
  const count = await redis.incr(fullKey);
  if (count === 1) await redis.expire(fullKey, ttlSeconds);
  return Number(count || 0);
}

async function addSetMemberWithTtl(redis, key, value, ttlSeconds) {
  const fullKey = redisKey(key);
  await redis.sadd(fullKey, value);
  await redis.expire(fullKey, ttlSeconds);
  return Number(await redis.scard(fullKey) || 0);
}

async function blockKey(redis, key, ttlSeconds) {
  await redis.set(redisKey(key), '1', 'EX', ttlSeconds);
}

async function existsKey(redis, key) {
  return Number(await redis.exists(redisKey(key))) > 0;
}

async function assertNotBlocked(context, loginIdentifier) {
  const redis = getRedisClient();
  if (context.ip && await existsKey(redis, `security:block:ip:${context.ip}`)) {
    throw new RateLimitError(FREQUENCY_ERROR);
  }
  if (context.deviceId && await existsKey(redis, `security:block:device:${context.deviceId}`)) {
    throw new RateLimitError(FREQUENCY_ERROR);
  }
  if (loginIdentifier) {
    if (context.ip && await existsKey(redis, `login:block:account_ip:${loginIdentifier}:${context.ip}`)) {
      throw new RateLimitError(FREQUENCY_ERROR);
    }
    const row = await repo.selectProtectionByIdentifier(loginIdentifier);
    if (row?.protected_until && new Date(row.protected_until).getTime() > Date.now()) {
      throw new RateLimitError(FREQUENCY_ERROR);
    }
  }
}

async function evaluateLoginRequest({ loginIdentifier, context }) {
  requireDeviceId(context.deviceId);
  await assertNotBlocked(context, loginIdentifier);

  const redis = getRedisClient();
  const ip1m = await incrWithTtl(redis, `login:attempt:ip:${context.ip}:1m`, 60);
  const ip5m = await incrWithTtl(redis, `login:attempt:ip:${context.ip}:5m`, 300);
  const device10m = await incrWithTtl(redis, `login:attempt:device:${context.deviceId}:10m`, 600);
  const account5m = await incrWithTtl(redis, `login:attempt:account:${loginIdentifier}:5m`, 300);
  await incrWithTtl(redis, `login:attempt:account_ip:${loginIdentifier}:${context.ip}`, 300);
  await incrWithTtl(redis, `login:attempt:account_device:${loginIdentifier}:${context.deviceId}`, 300);

  const ipAccountCount = await addSetMemberWithTtl(redis, `login:account_spray:${context.ip}`, loginIdentifier, 600);
  const deviceAccountCount = await addSetMemberWithTtl(redis, `login:device_spray:${context.deviceId}`, loginIdentifier, 600);

  if (ip1m > 20) throw new RateLimitError(FREQUENCY_ERROR);
  if (ip5m > 60) {
    await blockKey(redis, `security:block:ip:${context.ip}`, 15 * 60);
    await emitSecurityEvent({
      eventType: 'credential_stuffing_detected',
      severity: 'critical',
      title: '疑似撞库攻击',
      description: '单 IP 短时间登录请求过高，已临时封禁。',
      context,
      metadata: { ip5m },
    });
    throw new RateLimitError(FREQUENCY_ERROR);
  }
  if (deviceAccountCount > 10 || device10m > 80) {
    await blockKey(redis, `security:block:device:${context.deviceId}`, 60 * 60);
    await emitSecurityEvent({
      eventType: 'credential_stuffing_detected',
      severity: 'critical',
      title: '疑似设备撞库',
      description: '同一设备短时间尝试多个账号，已临时封禁。',
      context,
      metadata: { deviceAccountCount, device10m },
    });
    throw new RateLimitError(FREQUENCY_ERROR);
  }
  if (ipAccountCount > 20) {
    await emitSecurityEvent({
      eventType: 'password_spray_detected',
      severity: 'critical',
      title: '检测到密码喷洒风险',
      description: '同一 IP 短时间尝试大量不同账号。',
      context,
      metadata: { ipAccountCount },
    });
    throw new RateLimitError(FREQUENCY_ERROR);
  }

  let riskScore = 0;
  riskScore += Math.min(25, account5m * 2);
  riskScore += Math.min(30, ip5m);
  riskScore += Math.min(25, deviceAccountCount * 3);
  riskScore += Math.min(30, ipAccountCount * 2);
  if (!/mozilla|chrome|safari|firefox|edg/i.test(context.userAgent || '')) riskScore += 15;
  if (!context.accept || !context.language) riskScore += 10;
  if (isLikelyProxyOrDatacenterIp(context.ip)) riskScore += 15;

  if (riskScore >= 80) {
    await emitSecurityEvent({
      eventType: 'high_risk_login_blocked',
      severity: 'critical',
      title: '高风险登录已拦截',
      description: '登录请求风险评分过高，系统已拒绝。',
      context,
      metadata: { riskScore },
    });
    throw new RateLimitError(FREQUENCY_ERROR);
  }
  if (riskScore >= 40) {
    await new Promise((resolve) => setTimeout(resolve, riskScore >= 60 ? 1200 : 500));
  }
  return { riskScore, ipAccountCount, deviceAccountCount };
}

function isLikelyProxyOrDatacenterIp(ip) {
  const s = String(ip || '');
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1|fc|fd)/i.test(s) === false && false;
}

async function recordLoginFailure({ loginIdentifier, userId, context, riskScore, failureReason = 'invalid_credentials' }) {
  await repo.insertLoginAttempt({
    id: generateId(),
    userId,
    loginIdentifier,
    success: false,
    failureReason,
    riskScore,
    ip: context.ip,
    deviceId: context.deviceId,
    userAgent: context.userAgent,
  }).catch((e) => console.warn('[clientSecurity] login attempt write failed:', e?.message || e));

  const redis = getRedisClient();
  const account5m = await incrWithTtl(redis, `login:fail:account:${loginIdentifier}:5m`, 300);
  const account30m = await incrWithTtl(redis, `login:fail:account:${loginIdentifier}:30m`, 1800);
  const accountIp5m = await incrWithTtl(redis, `login:fail:account_ip:${loginIdentifier}:${context.ip}:5m`, 300);
  await incrWithTtl(redis, `login:fail:ip:${context.ip}:5m`, 300);
  await incrWithTtl(redis, `login:fail:device:${context.deviceId}:10m`, 600);

  if (accountIp5m >= 5) {
    await blockKey(redis, `login:block:account_ip:${loginIdentifier}:${context.ip}`, 300);
  }
  if (account5m >= 5) {
    await emitSecurityEvent({
      userId,
      eventType: 'login_failed_many_times',
      severity: 'warning',
      title: '账号短时间多次登录失败',
      description: '同账号短时间内出现多次登录失败。',
      context,
      metadata: { account5m },
    });
  }
  if (userId && account30m >= 10) {
    await repo.protectUser(userId, new Date(Date.now() + 30 * 60 * 1000), 'login_failed_many_times');
    await emitSecurityEvent({
      userId,
      eventType: 'account_protected',
      severity: 'critical',
      title: '账号已进入保护状态',
      description: '账号 30 分钟内多次登录失败，已临时保护。',
      context,
      metadata: { account30m },
    });
  }
}

async function recordLoginSuccess({ loginIdentifier, userId, context, riskScore }) {
  await repo.insertLoginAttempt({
    id: generateId(),
    userId,
    loginIdentifier,
    success: true,
    riskScore,
    ip: context.ip,
    deviceId: context.deviceId,
    userAgent: context.userAgent,
  }).catch((e) => console.warn('[clientSecurity] login attempt write failed:', e?.message || e));
  await repo.unprotectUser(userId).catch(() => {});
}

async function registerDeviceAndSession({ userId, context }) {
  requireDeviceId(context.deviceId);
  const existingDevice = await repo.findActiveDevice(userId, context.deviceId);
  const deviceCount = await repo.countUserDevices(userId);
  const knownIpCount = await repo.countUserIpLogins(userId, context.ip);
  await repo.upsertDevice({
    id: generateId(),
    userId,
    deviceId: context.deviceId,
    deviceName: inferDeviceName(context.userAgent),
    ip: context.ip,
    userAgent: context.userAgent,
    fingerprintHash: deviceFingerprint(context),
    trusted: deviceCount === 0,
  });

  if (!existingDevice && deviceCount > 0) {
    await emitSecurityEvent({
      userId,
      eventType: 'new_device_login',
      severity: 'notice',
      title: '新设备登录',
      description: '账号在一个新设备上登录。',
      context,
    });
  }
  if (knownIpCount === 0) {
    await emitSecurityEvent({
      userId,
      eventType: 'new_ip_login',
      severity: 'notice',
      title: '新 IP 登录',
      description: '账号从新的 IP 地址登录。',
      context,
    });
  }

  const token = signToken(userId, 0);
  const refreshToken = randomToken(48);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await repo.insertSession({
    id: generateId(),
    userId,
    deviceId: context.deviceId,
    refreshTokenHash: sha256(refreshToken),
    ip: context.ip,
    userAgent: context.userAgent,
    expiresAt,
  });
  return {
    accessToken: token.accessToken,
    refreshToken,
    expiresIn: token.expiresIn,
  };
}

async function rotateRefreshToken(refreshToken, context) {
  if (!refreshToken) throw new ValidationError('登录状态无效，请重新登录');
  requireDeviceId(context.deviceId);
  const session = await repo.findSessionByRefreshHash(sha256(refreshToken));
  if (!session) throw new AuthError('登录状态无效，请重新登录');
  if (String(session.device_id) !== String(context.deviceId)) {
    await repo.revokeAllSessions(session.user_id, 'refresh_device_mismatch');
    await emitSecurityEvent({
      userId: session.user_id,
      eventType: 'sessions_revoked',
      severity: 'critical',
      title: '会话异常，已撤销登录',
      description: '刷新令牌设备不匹配，系统已撤销该账号会话。',
      context,
      metadata: { sessionId: session.id },
    });
    throw new AuthError('登录状态无效，请重新登录');
  }
  const newRefreshToken = randomToken(48);
  await repo.rotateSessionRefreshToken(session.id, sha256(newRefreshToken), context);
  const token = signToken(session.user_id, 0);
  return {
    userId: session.user_id,
    sessionId: session.id,
    token: {
      accessToken: token.accessToken,
      refreshToken: newRefreshToken,
      expiresIn: token.expiresIn,
    },
  };
}

async function revokeCurrentSession(refreshToken, userId, reason = 'logout') {
  if (!refreshToken) return false;
  const session = await repo.findSessionByRefreshHash(sha256(refreshToken));
  if (!session || String(session.user_id) !== String(userId)) return false;
  await repo.revokeSession(session.id, userId, reason);
  return true;
}

async function getSessionIdForRefreshToken(refreshToken, userId) {
  if (!refreshToken) return null;
  const session = await repo.findSessionByRefreshHash(sha256(refreshToken));
  if (!session || String(session.user_id) !== String(userId)) return null;
  return session.id;
}

async function revokeOtherSessions(userId, keepSessionId, context, reason = 'password_changed') {
  await repo.revokeOtherSessions(userId, keepSessionId, reason);
  await emitSecurityEvent({
    userId,
    eventType: 'sessions_revoked',
    severity: 'warning',
    title: '其他设备会话已退出',
    description: '账号安全操作触发其他设备退出登录。',
    context: context || {},
    metadata: { keepSessionId, reason },
  });
}

async function revokeAllSessions(userId, context, reason = 'logout_all') {
  await repo.revokeAllSessions(userId, reason);
  await emitSecurityEvent({
    userId,
    eventType: 'sessions_revoked',
    severity: 'warning',
    title: '全部会话已退出',
    description: '账号所有登录会话已被撤销。',
    context: context || {},
    metadata: { reason },
  });
}

async function enforceRegisterRisk(context) {
  requireDeviceId(context.deviceId);
  const redis = getRedisClient();
  const ipCount = await incrWithTtl(redis, `register:ip:${context.ip}`, 3600);
  const deviceCount = await incrWithTtl(redis, `register:device:${context.deviceId}`, 24 * 3600);
  if (ipCount > 5 || deviceCount > 3) {
    await emitSecurityEvent({
      eventType: 'mass_register_detected',
      severity: 'critical',
      title: '检测到批量注册风险',
      description: '同 IP 或同设备注册数量超过阈值。',
      context,
      metadata: { ipCount, deviceCount },
    });
    throw new RateLimitError('注册请求过于频繁，请稍后再试');
  }
  return { ipCount, deviceCount, restricted: ipCount >= 3 || deviceCount >= 2 };
}

function validatePasswordPolicy(password, identifiers = {}) {
  const value = String(password || '');
  if (value.length < 8) throw new ValidationError('密码至少 8 位');
  if (/^\d+$/.test(value)) throw new ValidationError('密码不能为纯数字');
  if (COMMON_WEAK_PASSWORDS.has(value.toLowerCase())) throw new ValidationError('密码过于简单，请更换');
  const phone = String(identifiers.phone || '').replace(/\D+/g, '');
  const username = String(identifiers.username || '').trim().toLowerCase();
  const lower = value.toLowerCase();
  if (phone && (value === phone || value === phone.slice(-6))) {
    throw new ValidationError('密码不能与手机号或手机号后 6 位相同');
  }
  if (username && lower === username) throw new ValidationError('密码不能与用户名相同');
}

function inferDeviceName(userAgent = '') {
  const ua = String(userAgent || '');
  if (/iphone|ipad/i.test(ua)) return 'iOS 设备';
  if (/android/i.test(ua)) return 'Android 设备';
  if (/windows/i.test(ua)) return 'Windows 设备';
  if (/macintosh|mac os/i.test(ua)) return 'Mac 设备';
  return '未知设备';
}

const ADMIN_EVENT_MAP = {
  password_spray_detected: ['security.client_password_spray', 'P0'],
  credential_stuffing_detected: ['security.client_credential_stuffing', 'P0'],
  high_risk_login_blocked: ['security.client_high_risk_login', 'P1'],
  mass_register_detected: ['security.client_mass_register', 'P0'],
  account_protected: ['security.client_account_protected', 'P1'],
  sessions_revoked: ['security.client_sessions_revoked', 'P2'],
  login_failed_many_times: ['security.client_bruteforce', 'P1'],
};

async function emitSecurityEvent(input) {
  const context = input.context || {};
  await repo.insertSecurityEvent({
    id: generateId(),
    userId: input.userId,
    eventType: input.eventType,
    severity: input.severity || 'notice',
    title: input.title,
    description: input.description,
    ip: context.ip,
    deviceId: context.deviceId,
    userAgent: context.userAgent,
    metadata: input.metadata || {},
  }).catch((e) => console.warn('[clientSecurity] security event write failed:', e?.message || e));

  const mapped = ADMIN_EVENT_MAP[input.eventType];
  if (!mapped) return;
  try {
    const adminEventService = require('../../admin/service/adminEvent.service');
    await adminEventService.emitEvent({
      eventType: mapped[0],
      category: 'security',
      severity: input.adminSeverity || mapped[1],
      title: input.title,
      message: input.description || input.title,
      entityType: input.userId ? 'user' : (context.ip ? 'ip' : 'security'),
      entityId: input.userId || context.ip || context.deviceId || input.eventType,
      fingerprint: { eventType: mapped[0], userId: input.userId || null, ip: context.ip || null, deviceId: context.deviceId || null },
      payload: { ...(input.metadata || {}), deviceId: context.deviceId || null, ip: context.ip || null },
      source: 'client_account_security',
    }, { operatorType: 'system' });
  } catch (e) {
    console.warn('[clientSecurity] admin event emit failed:', e?.message || e);
  }
}

function mapSession(row) {
  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    deviceName: row.device_name || inferDeviceName(row.user_agent),
    ip: row.ip || '',
    userAgent: row.user_agent || '',
    trusted: Boolean(row.trusted),
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokeReason: row.revoke_reason,
  };
}

async function listSessions(userId) {
  const rows = await repo.listUserSessions(userId);
  return rows.map(mapSession);
}

async function revokeSession(userId, sessionId) {
  await repo.revokeSession(sessionId, userId, 'user_revoked');
}

module.exports = {
  LOGIN_ERROR,
  FREQUENCY_ERROR,
  buildContext,
  normalizeIdentifier,
  createLoginChallenge,
  consumeLoginChallenge,
  evaluateLoginRequest,
  recordLoginFailure,
  recordLoginSuccess,
  registerDeviceAndSession,
  rotateRefreshToken,
  revokeCurrentSession,
  getSessionIdForRefreshToken,
  revokeOtherSessions,
  revokeAllSessions,
  enforceRegisterRisk,
  validatePasswordPolicy,
  emitSecurityEvent,
  listSessions,
  revokeSession,
  requireDeviceId,
};
