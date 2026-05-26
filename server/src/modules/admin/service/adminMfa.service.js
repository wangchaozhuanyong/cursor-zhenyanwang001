const crypto = require('crypto');
const { BusinessError } = require('../../../errors/BusinessError');
const { generateId, signToken } = require('../../../utils/helpers');
const { randomBase32, verifyTotp, buildOtpAuthUrl } = require('../../../utils/totp');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/adminMfa.repository');
const rbacService = require('./rbac.service');
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require('@simplewebauthn/server');

const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SENSITIVE_ACTION_TOKEN_TTL_MS = Number(process.env.ADMIN_SENSITIVE_ACTION_TOKEN_MINUTES || 60) * 60 * 1000;
const ADMIN_ACCESS_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '15m';
const ADMIN_ACCESS_EXPIRES_SECONDS = Number(process.env.ADMIN_JWT_EXPIRES_SECONDS || 15 * 60);
const TRUSTED_DEVICE_ALLOWED_DAYS = new Set([7, 14, 30]);
const DEFAULT_TRUSTED_DEVICE_DAYS = 30;
const TRUSTED_DEVICE_COOKIE = 'admin_trusted_device';
const LEGACY_TRUSTED_DEVICE_COOKIE = 'admin_device_id';
const SENSITIVE_ACTION_COOKIE = 'admin_sensitive_action_token';
const DEFAULT_SENSITIVE_ACTION_CLASS = 'admin_sensitive';
const challenges = new Map();
const webAuthnChallenges = new Map();

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

function getClientIp(req) {
  const xf = req?.headers?.['x-forwarded-for'];
  return String(req?.ip || (typeof xf === 'string' ? xf.split(',')[0].trim() : '') || req?.socket?.remoteAddress || '');
}

function getIpRiskKey(req) {
  const raw = getClientIp(req)
    .replace(/^::ffff:/, '')
    .trim()
    .toLowerCase();
  if (!raw) return '';
  if (/^\d+\.\d+\.\d+\.\d+$/.test(raw)) {
    return raw.split('.').slice(0, 3).join('.');
  }
  if (raw.includes(':')) {
    return raw.split(':').slice(0, 4).join(':');
  }
  return raw;
}

function getIpRiskHash(req) {
  const key = getIpRiskKey(req);
  return key ? hashValue(key) : '';
}

function getRegionRiskKey(req) {
  const raw = String(
    req?.headers?.['cf-ipcountry']
      || req?.headers?.['x-vercel-ip-country']
      || req?.headers?.['cloudfront-viewer-country']
      || req?.headers?.['x-country-code']
      || req?.headers?.['x-geo-country']
      || '',
  ).trim().toUpperCase();
  if (!raw || raw === 'XX' || raw === 'T1') return '';
  return raw.replace(/[^A-Z0-9_-]/g, '').slice(0, 16);
}

function getRegionRiskHash(req) {
  const key = getRegionRiskKey(req);
  return key ? hashValue(key) : '';
}

function parseCookies(req) {
  const header = req?.headers?.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) return acc;
    try {
      acc[key] = decodeURIComponent(value);
    } catch {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function isSecureRequest(req) {
  return process.env.NODE_ENV === 'production'
    || req.secure
    || req.protocol === 'https'
    || req.get('x-forwarded-proto') === 'https';
}

function getTrustedDeviceToken(req) {
  const cookies = parseCookies(req);
  return cookies[TRUSTED_DEVICE_COOKIE] || cookies[LEGACY_TRUSTED_DEVICE_COOKIE] || '';
}

function getSensitiveActionToken(req) {
  const cookies = parseCookies(req);
  return String(req.get('x-admin-sensitive-action-token') || cookies[SENSITIVE_ACTION_COOKIE] || '');
}

function normalizeTrustDays(value) {
  const days = Number(value);
  return TRUSTED_DEVICE_ALLOWED_DAYS.has(days) ? days : DEFAULT_TRUSTED_DEVICE_DAYS;
}

function setTrustedDeviceCookie(req, res, token, days) {
  res.cookie(TRUSTED_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'strict',
    maxAge: days * 24 * 60 * 60 * 1000,
    path: '/api/admin',
  });
}

function setSensitiveActionCookie(req, res, token) {
  res.cookie(SENSITIVE_ACTION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'strict',
    maxAge: SENSITIVE_ACTION_TOKEN_TTL_MS,
    path: '/api/admin',
  });
}

function getDeviceLabel(req) {
  const ua = String(req.get('user-agent') || '').slice(0, 180);
  if (!ua) return 'Unknown browser';
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua)) return 'Safari';
  return ua.slice(0, 80);
}

function putChallenge(payload) {
  const ticket = crypto.randomBytes(32).toString('base64url');
  challenges.set(ticket, {
    ...payload,
    expiresAt: Date.now() + MFA_CHALLENGE_TTL_MS,
  });
  return ticket;
}

function putWebAuthnChallenge(payload) {
  webAuthnChallenges.set(payload.challenge, {
    ...payload,
    expiresAt: Date.now() + MFA_CHALLENGE_TTL_MS,
  });
}

function takeWebAuthnChallenge(challenge, expectedPurpose) {
  const row = webAuthnChallenges.get(challenge);
  webAuthnChallenges.delete(challenge);
  if (!row || row.expiresAt < Date.now()) {
    throw new BusinessError(401, 'Passkey challenge expired, please try again');
  }
  if (expectedPurpose && row.purpose !== expectedPurpose) {
    throw new BusinessError(400, 'Invalid passkey challenge');
  }
  return row;
}

function takeChallenge(ticket) {
  const challenge = challenges.get(ticket);
  challenges.delete(ticket);
  if (!challenge || challenge.expiresAt < Date.now()) {
    throw new BusinessError(401, 'MFA challenge expired, please log in again');
  }
  return challenge;
}

function peekChallenge(ticket, expectedPurpose) {
  const challenge = challenges.get(ticket);
  if (!challenge || challenge.expiresAt < Date.now()) {
    challenges.delete(ticket);
    throw new BusinessError(401, 'MFA challenge expired, please log in again');
  }
  if (expectedPurpose && challenge.purpose !== expectedPurpose) {
    throw new BusinessError(400, 'Invalid MFA challenge');
  }
  return challenge;
}

function getWebAuthnOrigin(req) {
  const configured = process.env.ADMIN_WEBAUTHN_ORIGIN || process.env.ADMIN_PUBLIC_ORIGIN || process.env.PUBLIC_ADMIN_ORIGIN;
  if (configured) return configured.replace(/\/$/, '');
  const origin = req.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${req.get('host')}`;
}

function getWebAuthnRpID(req) {
  const configured = process.env.ADMIN_WEBAUTHN_RP_ID;
  if (configured) return configured;
  return new URL(getWebAuthnOrigin(req)).hostname;
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function credentialRowToWebAuthn(row) {
  return {
    id: row.credential_id_enc || '',
    publicKey: Buffer.from(String(row.public_key || ''), 'base64url'),
    counter: Number(row.counter || 0),
    transports: parseJsonArray(row.transports),
  };
}

async function getStatus(userId) {
  const settings = await repo.selectMfaSettings(userId);
  return {
    enabled: Boolean(settings?.enabled),
    required: Boolean(settings?.required),
    lastVerifiedAt: settings?.last_verified_at || null,
  };
}

async function resolveRecentMfaVerifiedAt() {
  return 0;
}

async function evaluateTrustedDevice(userId, req) {
  const token = getTrustedDeviceToken(req);
  if (!token) return { trusted: false, riskReasons: ['new_device'] };
  const row = await repo.selectTrustedDevice(userId, hashValue(token));
  if (!row) return { trusted: false, riskReasons: ['new_device'] };
  const riskReasons = [];
  const userAgentHash = hashValue(req.get('user-agent') || '');
  if (row.user_agent_hash && row.user_agent_hash !== userAgentHash) riskReasons.push('new_browser');
  const ipHash = getIpRiskHash(req);
  if (row.trusted_ip_hash && ipHash && row.trusted_ip_hash !== ipHash) riskReasons.push('abnormal_ip');
  const regionHash = getRegionRiskHash(req);
  if (row.trusted_region_hash && regionHash && row.trusted_region_hash !== regionHash) {
    riskReasons.push('abnormal_region');
  }
  await repo.touchTrustedDevice(row.id, { lastIpHash: ipHash, lastRegionHash: regionHash }).catch(() => {});
  return {
    trusted: riskReasons.length === 0,
    riskReasons,
    deviceId: row.id,
  };
}

async function isTrustedDevice(userId, req) {
  const result = await evaluateTrustedDevice(userId, req);
  return result.trusted;
}

async function resolveLoginMfaContext(user, req) {
  const settings = await repo.selectMfaSettings(user.id);
  if (!settings?.enabled) return { mfaVerifiedAt: 0, mfaMethod: '' };
  const trusted = await evaluateTrustedDevice(user.id, req);
  if (!trusted.trusted) return { mfaVerifiedAt: 0, mfaMethod: '', riskReasons: trusted.riskReasons };
  return {
    mfaVerifiedAt: Math.floor(Date.now() / 1000),
    mfaMethod: 'trusted_device',
    riskReasons: [],
  };
}

async function buildLoginMfaChallenge(user, req) {
  const settings = await repo.selectMfaSettings(user.id);
  const enabled = Boolean(settings?.enabled);

  const trusted = enabled ? await evaluateTrustedDevice(user.id, req) : { trusted: false, riskReasons: [] };
  if (enabled && trusted.trusted) return null;

  if (enabled) {
    const credentials = await repo.listWebAuthnCredentials(user.id).catch(() => []);
    return {
      data: {
        mfaRequired: true,
        mfaTicket: putChallenge({ userId: user.id, purpose: 'login' }),
        methods: credentials.length ? ['totp', 'passkey'] : ['totp'],
        riskReasons: trusted.riskReasons,
      },
      message: 'MFA required',
    };
  }

  if (user.role === 'admin' || user.role === 'super_admin' || settings?.required) {
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
        methods: ['totp'],
      },
      message: 'MFA setup required',
    };
  }

  return null;
}

async function issueAdminSession(user, req, mfaVerifiedAt = 0, mfaMethod = 'totp') {
  const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
  const adminSessionId = crypto.randomBytes(18).toString('base64url');
  const token = signToken(user.id, rv, {
    accessExpiresIn: ADMIN_ACCESS_EXPIRES_IN,
    expiresInSeconds: ADMIN_ACCESS_EXPIRES_SECONDS,
    accessPayload: {
      adminSessionId,
      ...(mfaVerifiedAt ? { mfaVerifiedAt, mfaMethod } : {}),
    },
    refreshPayload: { adminSessionId },
  });
  const access = await rbacService.getAccessContext(user.id, user.role);
  if (mfaVerifiedAt && mfaMethod !== 'trusted_device') {
    await repo.touchMfaVerified(user.id).catch(() => {});
  }
  await writeAuditLog({
    req,
    operatorId: user.id,
    operatorName: user.nickname || user.phone || '',
    operatorRole: user.role,
    actionType: 'admin.mfa.verify',
    objectType: 'auth',
    objectId: user.id,
    summary: `admin MFA satisfied by ${mfaMethod || 'none'}`,
    result: 'success',
  });
  return {
    token,
    userId: user.id,
    role: String(user.role || ''),
    permissions: access.permissions,
    isSuperAdmin: access.isSuperAdmin,
    roleCodes: access.roleCodes,
    adminSessionId,
    mfaVerifiedAt,
    mfaMethod,
  };
}

async function verifyChallenge(body, req, res) {
  const ticket = String(body?.mfaTicket || '');
  const code = String(body?.code || '');
  const challenge = takeChallenge(ticket);
  const user = await repo.selectUserForMfa(challenge.userId);
  if (!user) throw new BusinessError(401, 'MFA session is invalid, please log in again');
  if (user.account_status === 'disabled' || user.account_status === 'blacklisted') {
    throw new BusinessError(403, 'Admin account disabled');
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
    throw new BusinessError(401, 'Invalid or expired verification code');
  }

  if (challenge.purpose === 'setup') {
    await repo.enableMfa(user.id, settings.totp_secret_enc);
  }

  if (body?.trustDevice) {
    const trustDays = normalizeTrustDays(body?.trustDays);
    const trustedToken = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + trustDays * 24 * 60 * 60 * 1000);
    await repo.upsertTrustedDevice({
      id: generateId(),
      userId: user.id,
      deviceHash: hashValue(trustedToken),
      userAgentHash: hashValue(req.get('user-agent') || ''),
      deviceLabel: getDeviceLabel(req),
      trustedIpHash: getIpRiskHash(req),
      trustedRegionHash: getRegionRiskHash(req),
      expiresAt: expires,
    });
    setTrustedDeviceCookie(req, res, trustedToken, trustDays);
  }

  return {
    data: await issueAdminSession(user, req, Math.floor(Date.now() / 1000), 'totp'),
    message: 'MFA verified',
  };
}

async function beginPasskeyRegistration(req) {
  const userId = req.user?.id;
  if (!userId) throw new BusinessError(401, 'Please log in first');
  const user = await repo.selectUserForMfa(userId);
  if (!user) throw new BusinessError(401, 'User does not exist');
  const existing = await repo.listWebAuthnCredentials(userId);
  const options = await generateRegistrationOptions({
    rpName: process.env.ADMIN_WEBAUTHN_RP_NAME || process.env.ADMIN_MFA_ISSUER || 'Admin Console',
    rpID: getWebAuthnRpID(req),
    userID: Buffer.from(String(user.id)),
    userName: user.phone || user.nickname || user.id,
    userDisplayName: user.nickname || user.phone || user.id,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    excludeCredentials: existing
      .filter((row) => row.credential_id_enc)
      .map((row) => ({
        id: row.credential_id_enc,
        transports: parseJsonArray(row.transports),
      })),
  });
  putWebAuthnChallenge({
    challenge: options.challenge,
    purpose: 'register',
    userId,
    origin: getWebAuthnOrigin(req),
    rpID: getWebAuthnRpID(req),
  });
  return { data: options };
}

async function finishPasskeyRegistration(body, req) {
  const userId = req.user?.id;
  if (!userId) throw new BusinessError(401, 'Please log in first');
  const response = body?.response || body;
  const challenge = String(response?.response?.clientDataJSON ? '' : body?.challenge || '');
  const expectedChallenge = challenge || undefined;
  let challengeRow = null;
  if (expectedChallenge) challengeRow = takeWebAuthnChallenge(expectedChallenge, 'register');
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: expectedChallenge || ((c) => {
      challengeRow = takeWebAuthnChallenge(c, 'register');
      return true;
    }),
    expectedOrigin: challengeRow?.origin || getWebAuthnOrigin(req),
    expectedRPID: challengeRow?.rpID || getWebAuthnRpID(req),
    requireUserVerification: false,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new BusinessError(400, 'Passkey registration failed');
  }
  const { credential, aaguid } = verification.registrationInfo;
  await repo.insertWebAuthnCredential({
    id: generateId(),
    userId,
    credentialIdHash: hashValue(credential.id),
    credentialIdEnc: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter || 0,
    transports: credential.transports || response?.response?.transports || [],
    aaguid,
    deviceLabel: String(body?.label || getDeviceLabel(req)).slice(0, 120),
  });
  await writeAuditLog({
    req,
    operatorId: userId,
    operatorRole: req.user?.role || '',
    actionType: 'admin.passkey.register',
    objectType: 'auth',
    objectId: userId,
    summary: 'admin passkey registered',
    result: 'success',
  });
  return { data: null, message: 'Passkey registered' };
}

async function beginPasskeyLogin(body, req) {
  const ticket = String(body?.mfaTicket || '');
  const challenge = peekChallenge(ticket, 'login');
  const credentials = await repo.listWebAuthnCredentials(challenge.userId);
  if (!credentials.length) throw new BusinessError(404, 'No passkey is registered for this account');
  const options = await generateAuthenticationOptions({
    rpID: getWebAuthnRpID(req),
    userVerification: 'preferred',
    allowCredentials: credentials
      .filter((row) => row.credential_id_enc)
      .map((row) => ({
        id: row.credential_id_enc,
        transports: parseJsonArray(row.transports),
      })),
  });
  putWebAuthnChallenge({
    challenge: options.challenge,
    purpose: 'login',
    userId: challenge.userId,
    mfaTicket: ticket,
    origin: getWebAuthnOrigin(req),
    rpID: getWebAuthnRpID(req),
  });
  return { data: options };
}

async function verifyPasskeyAuthenticationResponse({ response, expectedPurpose, req }) {
  const credentialId = String(response?.id || '');
  const credentialRow = await repo.selectWebAuthnCredentialByHash(hashValue(credentialId));
  if (!credentialRow) throw new BusinessError(404, 'Passkey not found');
  let challengeRow = null;
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: (c) => {
      challengeRow = takeWebAuthnChallenge(c, expectedPurpose);
      return true;
    },
    expectedOrigin: getWebAuthnOrigin(req),
    expectedRPID: getWebAuthnRpID(req),
    credential: credentialRowToWebAuthn(credentialRow),
    requireUserVerification: false,
  });
  if (!verification.verified || !verification.authenticationInfo) {
    throw new BusinessError(400, 'Passkey verification failed');
  }
  if (String(credentialRow.user_id) !== String(challengeRow.userId)) {
    throw new BusinessError(403, 'Passkey does not belong to this account');
  }
  await repo.updateWebAuthnCredentialCounter(credentialRow.id, verification.authenticationInfo.newCounter);
  return { credentialRow, challengeRow };
}

async function finishPasskeyLogin(body, req, res) {
  const response = body?.response || body;
  const { challengeRow } = await verifyPasskeyAuthenticationResponse({ response, expectedPurpose: 'login', req });
  const mfaChallenge = takeChallenge(challengeRow.mfaTicket);
  if (String(mfaChallenge.userId) !== String(challengeRow.userId) || mfaChallenge.purpose !== 'login') {
    throw new BusinessError(400, 'Invalid MFA challenge');
  }
  const user = await repo.selectUserForMfa(challengeRow.userId);
  if (!user) throw new BusinessError(401, 'User does not exist');
  if (body?.trustDevice) {
    const trustDays = normalizeTrustDays(body?.trustDays);
    const trustedToken = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + trustDays * 24 * 60 * 60 * 1000);
    await repo.upsertTrustedDevice({
      id: generateId(),
      userId: user.id,
      deviceHash: hashValue(trustedToken),
      userAgentHash: hashValue(req.get('user-agent') || ''),
      deviceLabel: getDeviceLabel(req),
      trustedIpHash: getIpRiskHash(req),
      trustedRegionHash: getRegionRiskHash(req),
      expiresAt: expires,
    });
    setTrustedDeviceCookie(req, res, trustedToken, trustDays);
  }
  return {
    data: await issueAdminSession(user, req, Math.floor(Date.now() / 1000), 'passkey'),
    message: 'Passkey verified',
  };
}

async function beginPasskeyStepUp(body, req) {
  const userId = req.user?.id;
  if (!userId) throw new BusinessError(401, 'Please log in first');
  const credentials = await repo.listWebAuthnCredentials(userId);
  if (!credentials.length) throw new BusinessError(404, 'No passkey is registered for this account');
  const actionClass = String(body?.actionClass || DEFAULT_SENSITIVE_ACTION_CLASS).slice(0, 80);
  const options = await generateAuthenticationOptions({
    rpID: getWebAuthnRpID(req),
    userVerification: 'preferred',
    allowCredentials: credentials
      .filter((row) => row.credential_id_enc)
      .map((row) => ({
        id: row.credential_id_enc,
        transports: parseJsonArray(row.transports),
      })),
  });
  putWebAuthnChallenge({
    challenge: options.challenge,
    purpose: 'step_up',
    userId,
    actionClass,
    origin: getWebAuthnOrigin(req),
    rpID: getWebAuthnRpID(req),
  });
  return { data: options };
}

async function finishPasskeyStepUp(body, req, res) {
  const response = body?.response || body;
  const { challengeRow } = await verifyPasskeyAuthenticationResponse({ response, expectedPurpose: 'step_up', req });
  if (String(challengeRow.userId) !== String(req.user?.id)) {
    throw new BusinessError(403, 'Passkey does not belong to this account');
  }
  const actionClass = String(challengeRow.actionClass || body?.actionClass || DEFAULT_SENSITIVE_ACTION_CLASS).slice(0, 80);
  const plainToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SENSITIVE_ACTION_TOKEN_TTL_MS);
  await repo.insertSensitiveActionToken({
    id: generateId(),
    userId: req.user.id,
    adminSessionId: String(req.user.adminSessionId || ''),
    deviceHash: hashValue(getTrustedDeviceToken(req) || ''),
    actionClass,
    tokenHash: hashValue(plainToken),
    expiresAt,
  });
  setSensitiveActionCookie(req, res, plainToken);
  return {
    data: {
      sensitiveActionToken: plainToken,
      actionClass,
      expiresAt,
      expiresIn: Math.floor(SENSITIVE_ACTION_TOKEN_TTL_MS / 1000),
    },
    message: 'Passkey verified',
  };
}

async function verifyReverify(body, req, res) {
  const userId = req.user?.id;
  if (!userId) throw new BusinessError(401, 'Please log in first');

  const settings = await repo.selectMfaSettings(userId);
  const secret = decryptSecret(settings?.totp_secret_enc);
  if (!settings?.enabled || !secret) {
    throw new BusinessError(403, 'Please complete MFA setup first');
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
    throw new BusinessError(401, 'Invalid or expired verification code');
  }

  await repo.touchMfaVerified(userId);
  const actionClass = String(body?.actionClass || DEFAULT_SENSITIVE_ACTION_CLASS).slice(0, 80);
  const adminSessionId = String(req.user?.adminSessionId || '');
  if (!adminSessionId) throw new BusinessError(401, 'Admin session expired, please log in again');

  const plainToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SENSITIVE_ACTION_TOKEN_TTL_MS);
  await repo.insertSensitiveActionToken({
    id: generateId(),
    userId,
    adminSessionId,
    deviceHash: hashValue(getTrustedDeviceToken(req) || ''),
    actionClass,
    tokenHash: hashValue(plainToken),
    expiresAt,
  });
  setSensitiveActionCookie(req, res, plainToken);

  await writeAuditLog({
    req,
    operatorId: userId,
    operatorName: req.user?.nickname || req.user?.phone || '',
    operatorRole: req.user?.role || '',
    actionType: 'admin.mfa.reverify',
    objectType: 'auth',
    objectId: userId,
    summary: `admin MFA step-up success actionClass=${actionClass}`,
    result: 'success',
  });

  return {
    data: {
      sensitiveActionToken: plainToken,
      actionClass,
      expiresAt,
      expiresIn: Math.floor(SENSITIVE_ACTION_TOKEN_TTL_MS / 1000),
    },
    message: 'MFA verified',
  };
}

function mfaRequiredResponse(res, message, actionClass = DEFAULT_SENSITIVE_ACTION_CLASS) {
  return res.status(403).json({
    code: 403,
    message,
    data: {
      mfaRequired: true,
      stepUpRequired: true,
      actionClass,
      tokenTtlSeconds: Math.floor(SENSITIVE_ACTION_TOKEN_TTL_MS / 1000),
      methods: ['totp', 'passkey'],
    },
  });
}

function requireSensitiveAction(actionClass = DEFAULT_SENSITIVE_ACTION_CLASS) {
  return function sensitiveActionMiddleware(req, res, next) {
    (async () => {
      if (!req.user) {
        if (typeof res.fail === 'function') return res.fail(401, 'Please log in first');
        return res.status(401).json({ code: 401, message: 'Please log in first' });
      }

      const adminSessionId = String(req.user.adminSessionId || '');
      const rawToken = getSensitiveActionToken(req);
      if (!adminSessionId || !rawToken) {
        return mfaRequiredResponse(res, 'Step-up MFA required', actionClass);
      }

      const row = await repo.selectSensitiveActionToken({
        userId: req.user.id,
        adminSessionId,
        actionClass,
        tokenHash: hashValue(rawToken),
      });
      if (!row) {
        return mfaRequiredResponse(res, 'Step-up MFA expired, please verify again', actionClass);
      }

      const expectedDeviceHash = hashValue(getTrustedDeviceToken(req) || '');
      if (row.device_hash && row.device_hash !== expectedDeviceHash) {
        return mfaRequiredResponse(res, 'Device state changed, please verify again', actionClass);
      }

      await repo.touchSensitiveActionToken(row.id).catch(() => {});
      req.sensitiveAction = { actionClass, tokenId: row.id };
      return next();
    })().catch(next);
  };
}

function requireRecentMfa(req, res, next) {
  return requireSensitiveAction(DEFAULT_SENSITIVE_ACTION_CLASS)(req, res, next);
}

module.exports = {
  getStatus,
  resolveRecentMfaVerifiedAt,
  resolveLoginMfaContext,
  buildLoginMfaChallenge,
  verifyChallenge,
  verifyReverify,
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  beginPasskeyLogin,
  finishPasskeyLogin,
  beginPasskeyStepUp,
  finishPasskeyStepUp,
  requireSensitiveAction,
  requireRecentMfa,
};
