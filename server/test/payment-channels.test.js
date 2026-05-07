require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

const phone = `6${Date.now().toString().slice(-7)}`;
const countryCode = '+60';

describe('payments API', () => {
  let accessToken;

  before(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone, countryCode, password: 'secret12', nickname: 'pay-t' })
      .expect(200);
    assert.equal(reg.body.code, 0);
    accessToken = reg.body.data?.token?.accessToken;
    assert.ok(accessToken);
  });

  test('GET /api/payments/channels', async () => {
    const res = await request(app)
      .get('/api/payments/channels')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(res.body.code, 0);
    assert.ok(Array.isArray(res.body.data));
  });
});
