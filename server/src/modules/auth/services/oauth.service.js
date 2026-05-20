// @ts-nocheck
/**
 * Google OAuth锛氭巿鏉冭烦杞笌鍥炶皟绛惧彂鐭湡 ticket锛屽墠绔?exchange 鎹?JWT
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
const repo = require('../repository/auth.repository');
const authService = require('../service/auth.service');

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

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const LOGIN_TICKET_TTL_MS = 5 * 60 * 1000;

function publicAppOrigin() {
  return String(process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function oauthCallbackBaseUrl() {
  const raw = (process.env.OAUTH_CALLBACK_BASE_URL || '').trim();
  if (raw) return raw.replace(/\/$/, '');
  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}`;
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw), 'utf8').digest('hex');
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

function assertProvider(p) {
  if (p !== 'google') throw new ValidationError('仅支持 Google 登录');
}

function googleClient() {
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) throw new ValidationError('Google 登录未配置或配置不完整');
  return { clientId, clientSecret };
}

function redirectUri(provider) {
  const base = oauthCallbackBaseUrl();
  return `${base}/api/auth/oauth/${provider}/callback`;
}

function buildGoogleAuthorizeUrl(plainState) {
  const { clientId } = googleClient();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri('google'),
    response_type: 'code',
    scope: 'openid email profile',
    state: plainState,
    prompt: 'select_account',
    access_type: 'online',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function isThirdPartyLoginEnabled() {
  return process.env.THIRD_PARTY_LOGIN_ENABLED === '1';
}

async function startOAuth(provider, redirectRaw) {
  if (!isThirdPartyLoginEnabled()) throw new ValidationError('第三方登录未开启');
  assertProvider(provider);
  const redirectAfter = sanitizeRedirectAfter(redirectRaw);

  const plainState = crypto.randomBytes(24).toString('hex');
  const stateHash = hashToken(plainState);
  const id = generateId();
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);

  await repo.insertOauthState({
    id,
    stateHash,
    provider,
    redirectAfter,
    expiresAt,
  });

  return buildGoogleAuthorizeUrl(plainState);
}

async function exchangeGoogleCode(code) {
  const { clientId, clientSecret } = googleClient();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri('google'),
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = asObject(await res.json().catch(() => ({})));
  if (!res.ok) {
    throw new ValidationError(strFrom(json.error_description) || strFrom(json.error) || 'Google 授权失败');
  }
  const accessToken = strFrom(json.access_token);
  if (!accessToken) throw new ValidationError('Google 授权信息不完整，请重新登录');

  const ui = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = asObject(await ui.json().catch(() => ({})));
  if (!ui.ok) throw new ValidationError(strFrom(profile.error_description) || '获取 Google 用户信息失败');

  return {
    providerUserId: strFrom(profile.sub),
    email: typeof profile.email === 'string' ? profile.email : null,
    displayName: typeof profile.name === 'string' ? profile.name : null,
    avatarUrl: typeof profile.picture === 'string' ? profile.picture : null,
  };
}

async function ensureUserForOauth(provider, profile) {
  const { providerUserId, email, displayName, avatarUrl } = profile;
  if (!providerUserId) throw new ValidationError('无法获取 Google 账号标识');

  const existing = await repo.selectOauthAccount(provider, providerUserId);
  if (existing) {
    await repo.updateOauthAccountProfile(existing.user_id, provider, {
      email,
      displayName,
      avatarUrl,
    });
    return existing.user_id;
  }

  const userId = generateId();
  const invite = generateInviteCode();
  const nickname = (displayName && String(displayName).trim())
    || (email && String(email).split('@')[0])
    || '用户';

  try {
    await repo.insertUser({
      id: userId,
      phone: null,
      passwordHash: null,
      nickname: String(nickname).slice(0, 100),
      inviteCode: invite,
      parentInviteCode: '',
    });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
      throw new ConflictError('创建账号失败，请重试');
    }
    throw err;
  }

  const autoPromoteFirstUser = process.env.AUTO_PROMOTE_FIRST_USER_TO_ADMIN === '1';
  if (autoPromoteFirstUser) {
    const userCount = await repo.countUsers();
    if (userCount === 1) {
      await repo.setUserRole(userId, 'admin');
    }
  }

  try {
    await repo.insertOauthAccount({
      id: generateId(),
      userId,
      provider,
      providerUserId,
      email,
      displayName,
      avatarUrl,
    });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
      const again = await repo.selectOauthAccount(provider, providerUserId);
      if (again) return again.user_id;
    }
    throw err;
  }

  return userId;
}

async function issueLoginTicketAndRedirectUrl(provider, userId, redirectAfter) {
  const rawCode = crypto.randomBytes(32).toString('hex');
  const codeHash = hashToken(rawCode);
  const id = generateId();
  const expiresAt = new Date(Date.now() + LOGIN_TICKET_TTL_MS);

  await repo.insertAuthLoginTicket({
    id,
    codeHash,
    provider,
    userId,
    expiresAt,
  });

  const base = publicAppOrigin();
  const path = sanitizeRedirectAfter(redirectAfter);
  const url = new URL(path, `${base}/`);
  url.searchParams.set('oauthCode', rawCode);
  url.searchParams.set('oauthProvider', provider);
  return url.toString();
}

function errorRedirect(message) {
  const base = publicAppOrigin();
  const u = new URL('/login', `${base}/`);
  u.searchParams.set('oauthError', message);
  return u.toString();
}

async function handleOAuthCallback(provider, query) {
  if (!isThirdPartyLoginEnabled()) return errorRedirect('第三方登录未开启');
  assertProvider(provider);

  if (query.error) {
    const msg = String(query.error_description || query.error || '已取消授权');
    return errorRedirect(msg.slice(0, 200));
  }

  const code = query.code;
  const stateParam = query.state;
  if (!code || !stateParam) return errorRedirect('授权参数不完整');

  const plain = String(stateParam).trim();
  if (!plain) return errorRedirect('授权状态无效');

  const stateHash = hashToken(plain);
  const row = await repo.selectOauthStateByHash(stateHash);
  if (!row || row.provider !== provider) return errorRedirect('授权状态无效或已过期');
  if (row.consumed_at) return errorRedirect('授权状态已使用');
  if (new Date(row.expires_at).getTime() <= Date.now()) return errorRedirect('授权状态已过期');

  await repo.markOauthStateConsumed(row.id);

  const redirectAfter = sanitizeRedirectAfter(row.redirect_after);

  let profile;
  try {
    profile = await exchangeGoogleCode(String(code));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '第三方登录失败';
    return errorRedirect(msg);
  }

  let userId;
  try {
    userId = await ensureUserForOauth(provider, profile);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '第三方登录失败';
    return errorRedirect(msg);
  }

  return issueLoginTicketAndRedirectUrl(provider, userId, redirectAfter);
}

async function exchangeTicket(body) {
  if (!isThirdPartyLoginEnabled()) throw new ValidationError('第三方登录未开启');
  const provider = String(body.provider || '').toLowerCase();
  assertProvider(provider);
  const code = String(body.code || '').trim();
  if (code.length < 16) throw new ValidationError('登录凭证无效');

  const codeHash = hashToken(code);
  const row = await repo.selectAuthLoginTicketByHash(codeHash);
  if (!row || String(row.provider) !== provider) throw new AuthError('登录凭证无效或已过期');

  const ok = await repo.tryConsumeAuthLoginTicket(row.id);
  if (!ok) throw new AuthError('登录凭证无效或已过期');

  return authService.issueLoginForUserId(row.user_id);
}

module.exports = {
  startOAuth,
  handleOAuthCallback,
  exchangeTicket,
  oauthCallbackBaseUrl,
  sanitizeRedirectAfter,
  /** 閰嶇疆缂哄け绛夛細娴忚鍣ㄨ烦杞?GET /start 鏃惰繑鍥?HTML 閲嶅畾鍚戣€岄潪 JSON */
  redirectLoginWithOAuthError: errorRedirect,
};

