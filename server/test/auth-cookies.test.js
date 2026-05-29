const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  resolveCookieSecure,
  setAuthCookies,
} = require('../src/utils/authCookies');

function mockReq({ secure = false, protocol = 'http', forwardedProto } = {}) {
  return {
    secure,
    protocol,
    get(name) {
      if (name === 'x-forwarded-proto') return forwardedProto;
      return undefined;
    },
  };
}

test('resolveCookieSecure respects AUTH_COOKIE_SECURE override', () => {
  const prev = process.env.AUTH_COOKIE_SECURE;
  const req = mockReq({ forwardedProto: 'http' });
  try {
    process.env.AUTH_COOKIE_SECURE = '1';
    assert.equal(resolveCookieSecure(req), true);
    process.env.AUTH_COOKIE_SECURE = '0';
    assert.equal(resolveCookieSecure(req), false);
    delete process.env.AUTH_COOKIE_SECURE;
    assert.equal(resolveCookieSecure(mockReq({ forwardedProto: 'https' })), true);
    assert.equal(resolveCookieSecure(mockReq()), false);
  } finally {
    if (prev === undefined) delete process.env.AUTH_COOKIE_SECURE;
    else process.env.AUTH_COOKIE_SECURE = prev;
  }
});

test('getAccessTokenFromRequest tolerates malformed cookie encoding', () => {
  const req = {
    headers: {
      cookie: 'bad=%E0%A4%A; access_token=good-token',
    },
  };

  const token = getAccessTokenFromRequest(req);
  assert.equal(token, 'good-token');
});

test('getRefreshTokenFromRequest keeps the first duplicate cookie value', () => {
  const req = {
    headers: {
      cookie: 'refresh_token=specific-token; other=1; refresh_token=stale-token',
    },
  };

  const token = getRefreshTokenFromRequest(req);
  assert.equal(token, 'specific-token');
});

test('setAuthCookies clears legacy storefront refresh cookie path', () => {
  const cleared = [];
  const cookies = [];
  const res = {
    clearCookie(name, options) {
      cleared.push({ name, options });
    },
    cookie(name, value, options) {
      cookies.push({ name, value, options });
    },
  };

  setAuthCookies(mockReq({ forwardedProto: 'https' }), res, {
    accessToken: 'access',
    refreshToken: 'refresh',
  });

  assert.ok(cleared.some((c) => c.name === 'refresh_token' && c.options.path === '/'));
  assert.ok(cookies.some((c) => c.name === 'refresh_token' && c.options.path === '/api/auth/refresh'));
});
