// @ts-nocheck
/**
 * 寰俊寮€鏀惧钩鍙扮綉绔欏簲鐢ㄦ壂鐮佺櫥褰曪紙snsapi_login锛? * 鎵嬫満鍙蜂负涓昏处鍙凤紝寰俊涓虹涓夋柟韬唤缁戝畾
 */
const crypto = require('crypto');
const {
  generateId,
  generateInviteCode,
} = require('../../../utils/helpers');
const {
  ValidationError,
  AuthError,
  ConflictError,
} = require('../../../errors');
const { setCache, getCache, deleteCache } = require('../../../utils/cache');
const { normalizeIntlPhone, buildPhoneLookupCandidates } = require('../../../utils/phone');
const repo = require('../repository/auth.repository');
const authService = require('../service/auth.service');
const otpService = require('./otp.service');

const PROVIDER = 'wechat_open';
const STATE_TTL_SECONDS = 10 * 60;
const PENDING_TTL_MS = 10 * 60 * 1000;
const STATE_CACHE_NS = 'wechat_oauth_state';

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw), 'utf8').digest('hex');
}

function hashUa(ua) {
  if (!ua || typeof ua !== 'string') return null;
  return crypto.createHash('sha256').update(ua, 'utf8').digest('hex');
}

function publicAppOrigin() {
  return String(process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function oauthCallbackBaseUrl() {
  const raw = (process.env.OAUTH_CALLBACK_BASE_URL || '').trim();
  if (raw) return raw.replace(/\/$/, '');
  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}`;
}

function wechatClient() {
  const appId = (process.env.WECHAT_OPEN_APP_ID || '').trim();
  const appSecret = (process.env.WECHAT_OPEN_APP_SECRET || '').trim();
  if (!appId || !appSecret) throw new ValidationError('Invalid input');
  return { appId, appSecret };
}

function isThirdPartyLoginEnabled() {
  return process.env.THIRD_PARTY_LOGIN_ENABLED === '1';
}

function isWechatLoginEnabled() {
  if (!isThirdPartyLoginEnabled()) return false;
  const appId = (process.env.WECHAT_OPEN_APP_ID || '').trim();
  const appSecret = (process.env.WECHAT_OPEN_APP_SECRET || '').trim();
  return Boolean(appId && appSecret);
}

function wechatCallbackUri() {
  return `${oauthCallbackBaseUrl()}/api/auth/wechat/callback`;
}

function sanitizeRedirectAfter(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  const d = s || '/login';
  if (!d.startsWith('/')) return '/login';
  if (d.startsWith('//')) return '/login';
  if (d.includes('\\')) return '/login';
  if (d.length > 512) return '/login';
  return d;
}

function buildAuthorizeUrl(plainState) {
  const { appId } = wechatClient();
  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: wechatCallbackUri(),
    response_type: 'code',
    scope: 'snsapi_login',
    state: plainState,
  });
  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}

async function saveOAuthState(plainState, payload) {
  const stateHash = hashToken(plainState);
  await setCache(stateHash, payload, {
    namespace: STATE_CACHE_NS,
    ttl: STATE_TTL_SECONDS,
  });
  return stateHash;
}

async function loadOAuthState(plainState) {
  const stateHash = hashToken(plainState);
  const payload = await getCache(stateHash, { namespace: STATE_CACHE_NS });
  return payload ? { stateHash, payload } : null;
}

async function consumeOAuthState(stateHash) {
  await deleteCache(stateHash, { namespace: STATE_CACHE_NS });
}

function errorRedirect(message) {
  const base = publicAppOrigin();
  const u = new URL('/login', `${base}/`);
  u.searchParams.set('wechatError', message);
  return { redirectUrl: u.toString() };
}

function bindPhoneRedirect(pendingToken) {
  const base = publicAppOrigin();
  const u = new URL('/login/bind-phone', `${base}/`);
  u.searchParams.set('pendingWechatToken', pendingToken);
  return { redirectUrl: u.toString() };
}

function loginSuccessRedirect() {
  const base = publicAppOrigin();
  const u = new URL('/', `${base}/`);
  u.searchParams.set('wechatLogin', '1');
  return { redirectUrl: u.toString() };
}

/** @param {unknown} v @returns {Record<string, unknown>} */
function asObject(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return /** @type {Record<string, unknown>} */ (v);
  return {};
}

/** @param {unknown} v */
function strFrom(v) {
  if (typeof v === 'string') return v;
  if (v == null || v === false) return '';
  return String(v);
}

async function exchangeWechatCode(code) {
  const { appId, appSecret } = wechatClient();
  const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
  tokenUrl.searchParams.set('appid', appId);
  tokenUrl.searchParams.set('secret', appSecret);
  tokenUrl.searchParams.set('code', String(code));
  tokenUrl.searchParams.set('grant_type', 'authorization_code');

  const res = await fetch(tokenUrl.toString());
  const json = asObject(await res.json().catch(() => ({})));
  if (json.errcode) {
    throw new ValidationError(strFrom(json.errmsg) || 'Message');
  }

  const accessToken = strFrom(json.access_token);
  const openid = strFrom(json.openid);
  if (!accessToken || !openid) throw new ValidationError('Invalid input');

  const unionidRaw = strFrom(json.unionid).trim();
  const unionid = unionidRaw || null;

  const infoUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
  infoUrl.searchParams.set('access_token', accessToken);
  infoUrl.searchParams.set('openid', openid);
  infoUrl.searchParams.set('lang', 'zh_CN');

  const uiRes = await fetch(infoUrl.toString());
  const profile = asObject(await uiRes.json().catch(() => ({})));
  if (profile.errcode) {
    throw new ValidationError(strFrom(profile.errmsg) || 'Message');
  }

  const profileUnionid = strFrom(profile.unionid).trim() || unionid;

  return {
    openid,
    unionid: profileUnionid || null,
    nickname: typeof profile.nickname === 'string' ? profile.nickname : null,
    avatarUrl: typeof profile.headimgurl === 'string' ? profile.headimgurl : null,
    appid: appId,
  };
}

async function findIdentityByWechat(profile) {
  if (profile.unionid) {
    const byUnion = await repo.selectAuthIdentityByUnionid(PROVIDER, profile.unionid);
    if (byUnion) return byUnion;
  }
  return repo.selectAuthIdentityByOpenid(PROVIDER, profile.openid);
}

async function createPendingToken(profile, userId = null) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const id = generateId();
  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);

  await repo.insertPendingWechatLogin({
    id,
    tokenHash,
    userId,
    providerOpenid: profile.openid,
    providerUnionid: profile.unionid,
    appid: profile.appid,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    expiresAt,
  });

  return rawToken;
}

async function bindWechatToUser(userId, profile) {
  const existingForUser = await repo.selectAuthIdentityByUserAndProvider(userId, PROVIDER);
  if (existingForUser) {
    throw new ConflictError('Message');
  }

  const other = await findIdentityByWechat(profile);
  if (other && String(other.user_id) !== String(userId)) {
    throw new ConflictError('Wechat account is already bound to another user');
  }

  await repo.insertAuthIdentity({
    id: generateId(),
    userId,
    provider: PROVIDER,
    providerOpenid: profile.openid,
    providerUnionid: profile.unionid,
    appid: profile.appid,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
  });
}

async function startWechatLogin(redirectRaw) {
  if (!isWechatLoginEnabled()) throw new ValidationError('Invalid input');

  const plainState = crypto.randomBytes(24).toString('hex');
  await saveOAuthState(plainState, {
    purpose: 'login',
    redirectAfter: sanitizeRedirectAfter(redirectRaw),
  });

  return buildAuthorizeUrl(plainState);
}

async function startWechatBind(userId, redirectRaw) {
  if (!isWechatLoginEnabled()) throw new ValidationError('Invalid input');
  if (!userId) throw new AuthError('Authentication failed');

  const plainState = crypto.randomBytes(24).toString('hex');
  await saveOAuthState(plainState, {
    purpose: 'bind',
    userId: String(userId),
    redirectAfter: sanitizeRedirectAfter(redirectRaw || '/settings'),
  });

  return buildAuthorizeUrl(plainState);
}

async function handleWechatCallback(query) {
  if (query.error || query.error_description) {
    const msg = String(query.error_description || query.error || 'Authorization cancelled');
    return errorRedirect(msg.slice(0, 200));
  }

  const code = query.code;
  const stateParam = query.state;
  if (!code || !stateParam) return errorRedirect('Authorization params incomplete');

  const plain = String(stateParam).trim();
  const stored = await loadOAuthState(plain);
  if (!stored) return errorRedirect('Authorization state invalid or expired');

  await consumeOAuthState(stored.stateHash);

  const { purpose, userId, redirectAfter } = stored.payload || {};
  if (purpose !== 'login' && purpose !== 'bind') return errorRedirect('Authorization state invalid');

  let profile;
  try {
    profile = await exchangeWechatCode(String(code));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Message';
    return errorRedirect(msg);
  }

  if (purpose === 'bind') {
    try {
      await bindWechatToUser(userId, profile);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Message';
      return errorRedirect(msg);
    }
    const base = publicAppOrigin();
    const path = sanitizeRedirectAfter(redirectAfter);
    const url = new URL(path, `${base}/`);
    url.searchParams.set('wechatBind', 'success');
    return { redirectUrl: url.toString() };
  }

  const identity = await findIdentityByWechat(profile);
  if (identity) {
    const user = await repo.selectUserPhoneAndPassword(identity.user_id);
    if (!user) return errorRedirect('User not found');

    if (!user.phone || !String(user.phone).trim()) {
      const pendingToken = await createPendingToken(profile, identity.user_id);
      return bindPhoneRedirect(pendingToken);
    }

    const loginResult = await authService.issueLoginForUserId(identity.user_id, {
      loginMethod: 'wechat_open',
    });
    return {
      ...loginSuccessRedirect(),
      authToken: loginResult.data.token,
    };
  }

  const pendingToken = await createPendingToken(profile, null);
  return bindPhoneRedirect(pendingToken);
}

async function bindPhone(body, reqMeta = {}) {
  const { phone, countryCode, smsCode, pendingWechatToken } = body;
  const normalizedPhone = normalizeIntlPhone(phone, countryCode);
  if (!normalizedPhone) throw new ValidationError('Invalid input');

  const token = String(pendingWechatToken || '').trim();
  if (token.length < 16) throw new ValidationError('Invalid input');

  const tokenHash = hashToken(token);
  const pending = await repo.selectPendingWechatByHash(tokenHash);
  if (!pending) throw new AuthError('Authentication failed');

  const consumed = await repo.tryConsumePendingWechat(pending.id);
  if (!consumed) throw new AuthError('Authentication failed');

  await otpService.verifyOtpForPurpose({
    phone,
    countryCode,
    code: smsCode,
    purpose: otpService.OTP_PURPOSE_WECHAT_BIND,
  });

  const profile = {
    openid: pending.provider_openid,
    unionid: pending.provider_unionid || null,
    nickname: pending.nickname,
    avatarUrl: pending.avatar_url,
    appid: pending.appid,
  };

  const existingIdentity = await findIdentityByWechat(profile);
  if (existingIdentity) {
    const boundUserId = existingIdentity.user_id;
    if (pending.user_id && String(pending.user_id) !== String(boundUserId)) {
      throw new ConflictError('Wechat account is already bound to another user');
    }
    const lookupPhones = buildPhoneLookupCandidates(phone, countryCode);
    const phoneUser = await repo.findUserByPhones(lookupPhones);
    if (phoneUser && String(phoneUser.id) !== String(boundUserId)) {
      throw new ConflictError('Phone is bound to another account');
    }
    if (!phoneUser) {
      await repo.updateUserPhone(boundUserId, normalizedPhone);
    }
    return authService.issueLoginForUserId(boundUserId, {
      loginMethod: 'wechat_open',
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
  }

  const lookupPhones = buildPhoneLookupCandidates(phone, countryCode);
  let targetUser = pending.user_id
    ? await repo.selectUserPhoneAndPassword(pending.user_id)
    : null;

  const phoneUser = await repo.findUserByPhones(lookupPhones);

  if (phoneUser) {
    const otherWechat = await repo.selectAuthIdentityByUserAndProvider(phoneUser.id, PROVIDER);
    if (otherWechat) {
      throw new ConflictError('Phone account is bound to another Wechat account');
    }
    await bindWechatToUser(phoneUser.id, profile);
    return authService.issueLoginForUserId(phoneUser.id, {
      loginMethod: 'wechat_open',
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
  }

  if (targetUser && targetUser.phone) {
    throw new ConflictError('Invalid account state');
  }

  if (!targetUser) {
    const userId = generateId();
    const invite = generateInviteCode();
    const nickname = (profile.nickname && String(profile.nickname).trim())
      || `User${normalizedPhone.replace(/\D/g, '').slice(-4) || 'new'}`;
    try {
      await repo.insertUser({
        id: userId,
        phone: normalizedPhone,
        passwordHash: null,
        nickname: String(nickname).slice(0, 100),
        inviteCode: invite,
        parentInviteCode: '',
      });
    } catch (err) {
      if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
        const again = await repo.findUserByPhones(lookupPhones);
        if (again) {
          await bindWechatToUser(again.id, profile);
          return authService.issueLoginForUserId(again.id, {
            loginMethod: 'wechat_open',
            ip: reqMeta.ip,
            userAgent: reqMeta.userAgent,
          });
        }
        throw new ConflictError('Phone already registered');
      }
      throw err;
    }
    targetUser = { id: userId };
  } else {
    await repo.updateUserPhone(targetUser.id, normalizedPhone);
  }

  await bindWechatToUser(targetUser.id, profile);

  const autoPromoteFirstUser = process.env.AUTO_PROMOTE_FIRST_USER_TO_ADMIN === '1';
  if (autoPromoteFirstUser) {
    const userCount = await repo.countUsers();
    if (userCount === 1) {
      await repo.setUserRole(targetUser.id, 'admin');
    }
  }

  return authService.issueLoginForUserId(targetUser.id, {
    loginMethod: 'wechat_open',
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
}

async function unbindWechatForUser(userId) {
  const identity = await repo.selectAuthIdentityByUserAndProvider(userId, PROVIDER);
  if (!identity) throw new ValidationError('Invalid input');

  const user = await repo.selectUserPhoneAndPassword(userId);
  if (!user) throw new AuthError('Authentication failed');

  const hasPhone = Boolean(user.phone && String(user.phone).trim());
  const hasPassword = Boolean(user.password_hash && String(user.password_hash).trim());

  if (!hasPhone && !hasPassword) {
    throw new ValidationError('Invalid input');
  }

  await repo.deleteAuthIdentityById(identity.id);
  return { data: null, message: 'Wechat unbound' };
}

async function getWechatIdentityForUser(userId) {
  const row = await repo.selectAuthIdentityByUserAndProvider(userId, PROVIDER);
  if (!row) return null;
  return {
    bound: true,
    nickname: row.nickname || null,
    avatarUrl: row.avatar_url || null,
    boundAt: row.bound_at || row.created_at,
    appid: row.appid || null,
    openid: row.provider_openid,
    unionid: row.provider_unionid || null,
  };
}

/** 鐢ㄦ埛绔祫鏂欙細涓嶆毚闇?openid / unionid */
async function getWechatBindingForProfile(userId) {
  const row = await repo.selectAuthIdentityByUserAndProvider(userId, PROVIDER);
  if (!row) return { bound: false };
  return {
    bound: true,
    nickname: row.nickname || null,
    avatarUrl: row.avatar_url || null,
    boundAt: row.bound_at || row.created_at,
  };
}

module.exports = {
  PROVIDER,
  isWechatLoginEnabled,
  startWechatLogin,
  startWechatBind,
  handleWechatCallback,
  bindPhone,
  unbindWechatForUser,
  getWechatIdentityForUser,
  getWechatBindingForProfile,
  redirectLoginWithWechatError: errorRedirect,
};

