require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

/** 与 registerBodySchema 一致：需含 countryCode；与 normalizeIntlPhone 兼容 */
const phone = `5${Date.now().toString().slice(-7)}`;
const countryCode = '+60';

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
});
