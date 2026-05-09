require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

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
