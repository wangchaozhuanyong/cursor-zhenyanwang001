require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const repo = require('../src/modules/auth/repository/auth.repository');
const { generateId } = require('../src/utils/helpers');

/** 与 registerBodySchema 一致：马来西亚本地号 + 强密码 */
function malaysiaTestPhone() {
  return `01${String(Date.now()).slice(-8)}`;
}

const TEST_PASSWORD = 'Secret12';
const TEST_PASSWORD_RESET = 'NewSecret12';
const phone = malaysiaTestPhone();
const countryCode = '+60';
process.env.EXPOSE_PASSWORD_RESET_TOKEN = 'true';

describe('auth API', () => {
  let refreshToken;

  before(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ phone, countryCode, password: TEST_PASSWORD, nickname: 't' })
      .expect(200);
    assert.equal(res.body.code, 0);
    assert.ok(res.body.data?.token?.accessToken);
    refreshToken = res.body.data.token.refreshToken;
  });

  test('POST /api/auth/login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone, countryCode, password: TEST_PASSWORD })
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
      .send({ token: requestReset.body.data.resetToken, newPassword: TEST_PASSWORD_RESET })
      .expect(200);
    assert.equal(confirm.body.code, 0);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ phone, countryCode, password: TEST_PASSWORD_RESET })
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
    const p = malaysiaTestPhone();
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
    const p = malaysiaTestPhone();
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

describe('WeChat auth API', () => {
  test('GET /api/auth/features includes wechatLoginEnabled', async () => {
    const res = await request(app).get('/api/auth/features').expect(200);
    assert.equal(res.body.code, 0);
    assert.equal(typeof res.body.data?.wechatLoginEnabled, 'boolean');
    assert.equal(typeof res.body.data?.smsOtpLoginEnabled, 'boolean');
  });

  test('GET /api/auth/wechat/login without config returns redirect with error', async () => {
    const prevId = process.env.WECHAT_OPEN_APP_ID;
    const prevSecret = process.env.WECHAT_OPEN_APP_SECRET;
    delete process.env.WECHAT_OPEN_APP_ID;
    delete process.env.WECHAT_OPEN_APP_SECRET;
    try {
      const res = await request(app)
        .get('/api/auth/wechat/login?redirect=%2Flogin')
        .expect(302);
      assert.match(String(res.headers.location || ''), /wechatError=/);
    } finally {
      if (prevId !== undefined) process.env.WECHAT_OPEN_APP_ID = prevId;
      if (prevSecret !== undefined) process.env.WECHAT_OPEN_APP_SECRET = prevSecret;
    }
  });
});

describe('OAuth ticket exchange', () => {
  before(() => {
    process.env.THIRD_PARTY_LOGIN_ENABLED = '1';
  });

  test('POST /api/auth/oauth/exchange', async () => {
    const p = malaysiaTestPhone();
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone: p, countryCode: '+60', password: TEST_PASSWORD, nickname: 'o' })
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

