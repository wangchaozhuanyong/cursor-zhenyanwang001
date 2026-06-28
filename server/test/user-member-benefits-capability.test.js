const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const routePath = require.resolve('../src/modules/user/routes/user.routes');
const profileCtrlPath = require.resolve('../src/modules/user/controller/profile.controller');
const privacyCtrlPath = require.resolve('../src/modules/user/controller/privacy.controller');
const authPath = require.resolve('../src/middleware/auth');
const rateLimitersPath = require.resolve('../src/middleware/rateLimiters');
const validatePath = require.resolve('../src/middleware/validate');
const authSchemasPath = require.resolve('../src/modules/auth/schemas/auth.schemas');
const userSchemasPath = require.resolve('../src/modules/user/schemas/user.schemas');
const siteCapabilityGuardPath = require.resolve('../src/middleware/siteCapabilityGuard');
const siteCapabilitiesServicePath = require.resolve('../src/modules/siteCapabilities/service/siteCapabilities.service');

const mockedPaths = [
  routePath,
  profileCtrlPath,
  privacyCtrlPath,
  authPath,
  rateLimitersPath,
  validatePath,
  authSchemasPath,
  userSchemasPath,
  siteCapabilityGuardPath,
  siteCapabilitiesServicePath,
];

function clearUserRouteCache() {
  for (const path of mockedPaths) {
    delete require.cache[path];
  }
}

function mockModule(path, exports) {
  require.cache[path] = {
    id: path,
    filename: path,
    loaded: true,
    exports,
  };
}

function createApp({ memberLevelEnabled }) {
  clearUserRouteCache();

  const capabilityKeys = [];
  let memberBenefitsCalled = 0;

  mockModule(authPath, (_req, _res, next) => next());
  mockModule(rateLimitersPath, {
    userQueryLimiter: (_req, _res, next) => next(),
  });
  mockModule(validatePath, {
    validate: () => (_req, _res, next) => next(),
  });
  mockModule(authSchemasPath, {
    updateProfileBodySchema: {},
    changePasswordBodySchema: {},
  });
  mockModule(userSchemasPath, {
    cancelAccountBodySchema: {},
  });
  mockModule(profileCtrlPath, {
    getProfile: (_req, res) => res.json({ ok: true }),
    getMemberBenefits: (_req, res) => {
      memberBenefitsCalled += 1;
      res.json({ ok: true });
    },
    updateProfile: (_req, res) => res.json({ ok: true }),
    changePassword: (_req, res) => res.json({ ok: true }),
  });
  mockModule(privacyCtrlPath, {
    exportAccountData: (_req, res) => res.json({ ok: true }),
    cancelAccount: (_req, res) => res.json({ ok: true }),
  });
  mockModule(siteCapabilitiesServicePath, {
    async isCapabilityEnabled(key) {
      capabilityKeys.push(key);
      return key === 'memberLevelEnabled' ? memberLevelEnabled : true;
    },
  });

  const app = express();
  app.use((_req, res, next) => {
    res.fail = (status, message) => res.status(status).json({ success: false, message });
    next();
  });
  app.use('/user', require(routePath));

  return {
    app,
    capabilityKeys,
    get memberBenefitsCalled() {
      return memberBenefitsCalled;
    },
  };
}

afterEach(() => {
  clearUserRouteCache();
});

test('GET /user/member-benefits is blocked when memberLevelEnabled is disabled', async () => {
  const context = createApp({ memberLevelEnabled: false });

  const response = await request(context.app).get('/user/member-benefits');

  assert.equal(response.status, 403);
  assert.equal(response.body.message, '本站未启用会员等级功能');
  assert.deepEqual(context.capabilityKeys, ['memberLevelEnabled']);
  assert.equal(context.memberBenefitsCalled, 0);
});

test('GET /user/member-benefits reaches controller when memberLevelEnabled is enabled', async () => {
  const context = createApp({ memberLevelEnabled: true });

  const response = await request(context.app).get('/user/member-benefits');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.deepEqual(context.capabilityKeys, ['memberLevelEnabled']);
  assert.equal(context.memberBenefitsCalled, 1);
});
