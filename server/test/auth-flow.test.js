require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const repo = require('../src/modules/auth/auth.repository');
const { generateId } = require('../src/utils/helpers');

/** 与 registerBodySchema 一致：需含 countryCode；与 normalizeIntlPhone 兼容 */
const phone = `5${Date.now().toString().slice(-7)}`;
const countryCode = '+60';
process.env.EXPOSE_PASSWORD_RESET_TOKEN = 'true';

describe('auth API', () => {
  let refreshToken;

  before(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ phone, countryCode, password: 'secret12', nickname: 't' })
      .expect(200);
    assert.equal(res.body.code, 0);
    assert.ok(res.body.data?.token?.accessToken);
    refreshToken = res.body.data.token.refreshToken;
  });

  test('POST /api/auth/login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone, countryCode, password: 'secret12' })
      .expect(200);
    assert.equal(res.body.code, 0);
    assert.ok(res.body.data?.token?.refreshToken);
    refreshToken = res.body.data.token.refreshToken;
  });

  test('POST /api/auth/refresh', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    assert.equal(res.body.code, 0);
    assert.ok(res.body.data?.accessToken);
  });

  test('POST /api/auth/password-reset/request and confirm', async () => {
    const requestReset = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ phone, countryCode })
      .expect(200);
    assert.equal(requestReset.body.code, 0);
    assert.ok(requestReset.body.data?.resetToken);

    const confirm = await request(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token: requestReset.body.data.resetToken, newPassword: 'newSecret12' })
      .expect(200);
    assert.equal(confirm.body.code, 0);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ phone, countryCode, password: 'newSecret12' })
      .expect(200);
    assert.equal(login.body.code, 0);
    assert.ok(login.body.data?.token?.accessToken);
  });
});

describe('OTP auth API', () => {
  before(() => {
    process.env.EXPOSE_OTP_CODE = 'true';
  });

  test('POST /api/auth/otp/send and /api/auth/otp/login new user', async () => {
    const p = `5${Date.now().toString().slice(-8)}`;
    const send = await request(app)
      .post('/api/auth/otp/send')
      .send({ phone: p, countryCode: '+60' })
      .expect(200);
    assert.equal(send.body.code, 0);
    assert.ok(send.body.data?.devOtp);

    const login = await request(app)
      .post('/api/auth/otp/login')
      .send({ phone: p, countryCode: '+60', code: String(send.body.data.devOtp) })
      .expect(200);
    assert.equal(login.body.code, 0);
    assert.ok(login.body.data?.token?.accessToken);
  });

  test('POST /api/auth/otp/login rejects bad code', async () => {
    const p = `5${Date.now().toString().slice(-8)}`;
    await request(app)
      .post('/api/auth/otp/send')
      .send({ phone: p, countryCode: '+60' })
      .expect(200);
    const login = await request(app)
      .post('/api/auth/otp/login')
      .send({ phone: p, countryCode: '+60', code: '000000' })
      .expect(401);
    assert.notEqual(login.body.code, 0);
  });
});

describe('OAuth ticket exchange', () => {
  test('POST /api/auth/oauth/exchange', async () => {
    const p = `5${Date.now().toString().slice(-8)}`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone: p, countryCode: '+60', password: 'secret12', nickname: 'o' })
      .expect(200);
    const userId = reg.body.data.userId;
    const rawCode = crypto.randomBytes(24).toString('hex');
    const codeHash = crypto.createHash('sha256').update(rawCode, 'utf8').digest('hex');
    await repo.insertAuthLoginTicket({
      id: generateId(),
      codeHash,
      provider: 'google',
      userId,
      expiresAt: new Date(Date.now() + 120_000),
    });

    const exch = await request(app)
      .post('/api/auth/oauth/exchange')
      .send({ provider: 'google', code: rawCode })
      .expect(200);
    assert.equal(exch.body.code, 0);
    assert.ok(exch.body.data?.token?.accessToken);

    const again = await request(app)
      .post('/api/auth/oauth/exchange')
      .send({ provider: 'google', code: rawCode })
      .expect(401);
    assert.notEqual(again.body.code, 0);
  });
});
