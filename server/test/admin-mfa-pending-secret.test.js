const test = require('node:test');
const assert = require('node:assert/strict');

function putMockModule(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function loadServiceWithRepo(repo) {
  const servicePath = require.resolve('../src/modules/admin/service/adminMfa.service');
  const repoPath = require.resolve('../src/modules/admin/repository/adminMfa.repository');
  const auditPath = require.resolve('../src/utils/auditLog');
  const rbacPath = require.resolve('../src/modules/admin/service/rbac.service');

  delete require.cache[servicePath];
  delete require.cache[repoPath];
  delete require.cache[auditPath];
  delete require.cache[rbacPath];

  putMockModule(repoPath, repo);
  putMockModule(auditPath, { writeAuditLog: async () => {} });
  putMockModule(rbacPath, {
    getAccessContext: async () => ({ permissions: [], isSuperAdmin: true, roleCodes: ['super_admin'] }),
  });

  return require(servicePath);
}

function makeReq() {
  return {
    headers: {},
    socket: {},
    protocol: 'http',
    secure: false,
    get() {
      return '';
    },
  };
}

test('MFA setup reuses pending secret instead of replacing the QR code secret', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-admin-mfa-secret-for-pending-setup-reuse';

  const rows = new Map();
  const upserts = [];
  const repo = {
    async selectMfaPolicy() {
      return { enabled: true, updatedAt: null };
    },
    async selectMfaSettings(userId) {
      return rows.get(userId) || null;
    },
    async upsertPendingMfaSettings(userId, encryptedSecret) {
      upserts.push(encryptedSecret);
      if (!rows.get(userId)?.totp_secret_enc) {
        rows.set(userId, {
          user_id: userId,
          enabled: 0,
          required: 1,
          totp_secret_enc: encryptedSecret,
        });
      }
      return rows.get(userId);
    },
  };

  try {
    const service = loadServiceWithRepo(repo);
    const user = { id: 'admin-1', phone: '18800000001', nickname: 'Admin', role: 'super_admin' };

    const first = await service.buildLoginMfaChallenge(user, makeReq());
    const second = await service.buildLoginMfaChallenge(user, makeReq());

    assert.equal(first.data.mfaSetupRequired, true);
    assert.equal(second.data.mfaSetupRequired, true);
    assert.equal(second.data.secret, first.data.secret);
    assert.equal(upserts.length, 1);
    assert.match(first.data.otpAuthUrl, new RegExp(`secret=${first.data.secret}`));
    assert.match(second.data.otpAuthUrl, new RegExp(`secret=${first.data.secret}`));
  } finally {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwtSecret;
  }
});

test('MFA policy disabled skips login MFA challenge even for super admin', async () => {
  const repo = {
    async selectMfaPolicy() {
      return { enabled: false, updatedAt: null };
    },
    async selectMfaSettings() {
      throw new Error('selectMfaSettings should not be called when MFA policy is disabled');
    },
    async upsertPendingMfaSettings() {
      throw new Error('upsertPendingMfaSettings should not be called when MFA policy is disabled');
    },
  };

  const service = loadServiceWithRepo(repo);
  const user = { id: 'admin-1', phone: '18800000001', nickname: 'Admin', role: 'super_admin' };
  const result = await service.buildLoginMfaChallenge(user, makeReq());

  assert.equal(result, null);
});

test('MFA policy disabled lets sensitive admin actions continue without step-up', async () => {
  const repo = {
    async selectMfaPolicy() {
      return { enabled: false, updatedAt: null };
    },
    async selectSensitiveActionToken() {
      throw new Error('selectSensitiveActionToken should not be called when MFA policy is disabled');
    },
  };

  const service = loadServiceWithRepo(repo);
  let nextCalled = false;

  await new Promise((resolve, reject) => {
    service.requireSensitiveAction('bulk_delete')(
      { user: { id: 'admin-1', adminSessionId: 'session-1' } },
      {},
      (err) => {
        if (err) return reject(err);
        nextCalled = true;
        return resolve();
      },
    );
  });

  assert.equal(nextCalled, true);
});
