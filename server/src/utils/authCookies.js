const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const ADMIN_ACCESS_COOKIE = 'admin_access_token';
const ADMIN_REFRESH_COOKIE = 'admin_refresh_token';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) return acc;
    if (Object.prototype.hasOwnProperty.call(acc, key)) {
      // Browsers send more specific cookie paths first; keep that value if a
      // stale broader-path cookie with the same name is also present. Test
      // clients can also echo an expired empty cookie before the fresh one.
      if (!acc[key] && value) {
        try {
          acc[key] = decodeURIComponent(value);
        } catch {
          acc[key] = value;
        }
      }
      return acc;
    }
    try {
      acc[key] = decodeURIComponent(value);
    } catch {
      // Ignore malformed cookie values to avoid auth middleware 500/DoS.
      acc[key] = value;
    }
    return acc;
  }, {});
}

function isSecureCookie(req) {
  return req.secure || req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
}

function resolveCookieSecure(req) {
  const override = process.env.AUTH_COOKIE_SECURE;
  if (override === '1') return true;
  if (override === '0') return false;
  return isSecureCookie(req);
}

function setAuthCookies(req, res, token, prefix = '') {
  const accessName = prefix === 'admin' ? ADMIN_ACCESS_COOKIE : ACCESS_COOKIE;
  const refreshName = prefix === 'admin' ? ADMIN_REFRESH_COOKIE : REFRESH_COOKIE;
  const secure = resolveCookieSecure(req);

  clearLegacyAuthCookies(req, res, prefix);

  res.cookie(accessName, token.accessToken, {
    httpOnly: true,
    secure,
    sameSite: prefix === 'admin' ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: prefix === 'admin' ? '/api/admin' : '/',
  });
  res.cookie(refreshName, token.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: prefix === 'admin' ? '/api/admin' : '/api/auth/refresh',
  });
}

function clearLegacyAuthCookies(req, res, prefix = '') {
  const secure = resolveCookieSecure(req);
  const common = { httpOnly: true, secure };
  if (prefix === 'admin') {
    res.clearCookie(ADMIN_ACCESS_COOKIE, { ...common, sameSite: 'lax', path: '/' });
    return;
  }
  res.clearCookie(REFRESH_COOKIE, { ...common, sameSite: 'strict', path: '/' });
}

function clearAuthCookies(req, res, prefix = '') {
  const secure = resolveCookieSecure(req);
  const common = { httpOnly: true, secure };
  if (prefix === 'admin') {
    res.clearCookie(ADMIN_ACCESS_COOKIE, { ...common, sameSite: 'lax', path: '/' });
    res.clearCookie(ADMIN_ACCESS_COOKIE, { ...common, sameSite: 'strict', path: '/api/admin' });
    res.clearCookie(ADMIN_REFRESH_COOKIE, { ...common, sameSite: 'strict', path: '/api/admin' });
    return;
  }
  res.clearCookie(ACCESS_COOKIE, { ...common, sameSite: 'lax', path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...common, sameSite: 'strict', path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...common, sameSite: 'strict', path: '/api/auth/refresh' });
}

function getAccessTokenFromRequest(req, prefix = '') {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.split(' ')[1];
  const cookies = parseCookies(req);
  return cookies[prefix === 'admin' ? ADMIN_ACCESS_COOKIE : ACCESS_COOKIE] || '';
}

function getRefreshTokenFromRequest(req, prefix = '') {
  const cookies = parseCookies(req);
  return cookies[prefix === 'admin' ? ADMIN_REFRESH_COOKIE : REFRESH_COOKIE] || '';
}

module.exports = {
  setAuthCookies,
  clearAuthCookies,
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  resolveCookieSecure,
  isSecureCookie,
};
