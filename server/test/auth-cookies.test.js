const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  resolveCookieSecure,
  setAuthCookies,
} = require('../src/utils/authCookies');
const { refreshBodySchema } = require('../src/modules/auth/schemas/auth.schemas');

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

test('refresh body schema accepts missing body for cookie-based refresh', () => {
  const result = refreshBodySchema.safeParse(undefined);
  assert.equal(result.success, true);
  assert.deepEqual(result.data, {});
});

test('refresh session probe returns status without throwing for cookie checks', async () => {
  const controllerPath = require.resolve('../src/modules/auth/controller/auth.controller');
  const servicePath = require.resolve('../src/modules/auth/service/auth.service');
  delete require.cache[controllerPath];
  delete require.cache[servicePath];

  const seen = [];
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: {
      sessionStatus: async (tokens) => {
        seen.push(tokens);
        return { data: { authenticated: Boolean(tokens.refreshToken) } };
      },
    },
  };

  const ctrl = require(controllerPath);
  let payload = null;
  let nextError = null;
  await new Promise((resolve) => {
    ctrl.refreshSession(
      { headers: { cookie: 'refresh_token=specific-token' } },
      {
        success(data) {
          payload = data;
          resolve();
        },
      },
      (error) => {
        nextError = error;
        resolve();
      },
    );
  });

  assert.equal(nextError, null);
  assert.deepEqual(seen, [{ refreshToken: 'specific-token' }]);
  assert.deepEqual(payload, { authenticated: true });

  delete require.cache[controllerPath];
  delete require.cache[servicePath];
});
