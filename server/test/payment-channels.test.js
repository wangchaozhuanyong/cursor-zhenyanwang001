require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

function malaysiaTestPhone() {
  return `01${String(Date.now()).slice(-8)}`;
}

const TEST_PASSWORD = 'Secret12';
const phone = malaysiaTestPhone();
const countryCode = '+60';

describe('payments API', () => {
  let accessToken;

  before(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone, countryCode, password: TEST_PASSWORD, nickname: 'pay-t' })
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

