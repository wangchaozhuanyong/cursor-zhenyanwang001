/**
 * 站点功能开关：配置归一化、持久化与管理端 API。
 */
require('./setupTestEnv').requireTestDatabase();
require('./_dbCleanup.test');
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { DEFAULT_SITE_CAPABILITIES } = require('../src/config/siteCapabilities');
const siteCapabilities = require('../src/modules/siteCapabilities/service/siteCapabilities.service');
const rbac = require('../src/modules/admin/service/rbac.service');
const rbacRepo = require('../src/modules/admin/repository/rbac.repository');
const mfaRepo = require('../src/modules/admin/repository/adminMfa.repository');
const { signToken } = require('../src/utils/helpers');

function withAdminGatewayHeaders(req) {
  return req
    .set('Host', '127.0.0.1:3000')
    .set('Origin', 'http://127.0.0.1:3000')
    .set('Referer', 'http://127.0.0.1:3000/admin');
}

function malaysiaTestPhone() {
  const seed = `${Date.now()}${process.pid}${Math.random().toString(36).slice(2, 9)}`.replace(/\D/g, '');
  return `01${seed.slice(-8)}`;
}

describe('site capabilities service', () => {
  let saved;

  before(async () => {
    saved = await siteCapabilities.getSiteCapabilities();
  });

  after(async () => {
    await siteCapabilities.saveSiteCapabilities(saved);
  });

  test('save and isCapabilityEnabled roundtrip', async () => {
    const patch = { ...saved, reviewEnabled: false, trafficAnalyticsEnabled: false };
    await siteCapabilities.saveSiteCapabilities(patch);
    assert.equal(await siteCapabilities.isCapabilityEnabled('reviewEnabled'), false);
    assert.equal(await siteCapabilities.isCapabilityEnabled('trafficAnalyticsEnabled'), false);
    assert.equal(await siteCapabilities.isCapabilityEnabled('mallEnabled'), true);
  });
});

describe('admin settings features API', () => {
  const phone = malaysiaTestPhone();
  const countryCode = '+60';
  const password = 'Secret12';
  let admin;
  let adminAccessToken;
  let savedCapabilities;
  let savedMfaPolicy;

  before(async () => {
    savedCapabilities = await siteCapabilities.getSiteCapabilities();
    savedMfaPolicy = await mfaRepo.selectMfaPolicy();
    await mfaRepo.upsertMfaPolicy({ enabled: false });

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone, countryCode, password, nickname: 'feat' });
    assert.ok(reg.status === 200 || reg.status === 409, JSON.stringify(reg.body));

    let userId = reg.body?.data?.userId;
    if (!userId) {
      const [[row]] = await db.query(
        'SELECT id FROM users WHERE phone LIKE ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
        [`%${phone.replace(/^0+/, '')}%`],
      );
      userId = row?.id;
    }
    assert.ok(userId, 'registered user required for admin API tests');

    const rolesRes = await rbac.listRoles();
    const managerRole = rolesRes.data.find((r) => r.code === 'admin_manager');
    assert.ok(managerRole, 'admin_manager role required for settings.manage');
    await db.query("UPDATE users SET role = 'admin' WHERE id = ?", [userId]);
    await rbacRepo.replaceUserRoles(userId, [managerRole.id]);

    admin = request.agent(app);
    const login = await withAdminGatewayHeaders(
      admin.post('/api/admin/auth/login'),
    )
      .send({ phone, countryCode, password });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.equal(login.body.code, 0, 'admin login required for settings.features tests');
    assert.ok(login.body.data?.token?.accessToken, 'admin session token required');

    const [[userRow]] = await db.query(
      'SELECT refresh_token_version FROM users WHERE id = ? LIMIT 1',
      [userId],
    );
    const rv = Number.isFinite(Number(userRow?.refresh_token_version))
      ? Number(userRow.refresh_token_version)
      : 0;
    const stamped = signToken(userId, rv, {
      accessExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '15m',
      expiresInSeconds: Number(process.env.ADMIN_JWT_EXPIRES_SECONDS || 900),
      accessPayload: { mfaVerifiedAt: Math.floor(Date.now() / 1000) },
    });
    adminAccessToken = stamped.accessToken;
  });

  after(async () => {
    await siteCapabilities.saveSiteCapabilities(savedCapabilities);
    if (savedMfaPolicy) await mfaRepo.upsertMfaPolicy(savedMfaPolicy);
  });

  test('GET /api/admin/settings/features returns all capability keys', async () => {
    const res = await withAdminGatewayHeaders(admin.get('/api/admin/settings/features')).expect(200);
    assert.equal(res.body.code, 0);
    const data = res.body.data;
    for (const key of Object.keys(DEFAULT_SITE_CAPABILITIES)) {
      assert.equal(typeof data[key], 'boolean', `missing boolean key: ${key}`);
    }
  });

  test('PUT /api/admin/settings/features persists changes', async () => {
    const csrfRes = await withAdminGatewayHeaders(admin.get('/api/admin/auth/csrf')).expect(200);
    const csrfToken = csrfRes.body?.data?.csrfToken || csrfRes.body?.csrfToken || '';
    assert.ok(csrfToken);

    const next = { ...savedCapabilities, couponEnabled: false };
    const put = await withAdminGatewayHeaders(
      admin.put('/api/admin/settings/features'),
    )
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send(next)
      .expect(200);
    assert.equal(put.body.code, 0);
    assert.equal(put.body.data.couponEnabled, false);

    const stored = await siteCapabilities.getSiteCapabilities();
    assert.equal(stored.couponEnabled, false);

    const get = await withAdminGatewayHeaders(admin.get('/api/admin/settings/features')).expect(200);
    assert.equal(get.body.data.couponEnabled, false);
  });

  test('sms OTP login feature follows admin capability switch', async () => {
    await siteCapabilities.saveSiteCapabilities({ ...savedCapabilities, smsOtpLoginEnabled: false });

    const features = await request(app).get('/api/auth/features').expect(200);
    assert.equal(features.body.code, 0);
    assert.equal(features.body.data.smsOtpLoginEnabled, false);

    const otpSend = await request(app)
      .post('/api/auth/otp/send')
      .send({ phone: malaysiaTestPhone(), countryCode });
    assert.notEqual(otpSend.status, 200);
    assert.match(JSON.stringify(otpSend.body), /当前未开启短信验证码登录/);
  });
});
