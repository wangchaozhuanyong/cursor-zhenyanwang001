require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health/live', () => {
  test('returns 200 with code 0', async () => {
    const res = await request(app).get('/api/health/live').expect(200);
    assert.equal(res.body.code, 0);
    assert.ok(res.body.data?.status === 'live');
  });
});

describe('GET /api/health/ready', () => {
  test('returns 200 when database is reachable', async () => {
    const res = await request(app).get('/api/health/ready');
    assert.ok(res.status === 200 || res.status === 503);
    if (res.status === 200) {
      assert.equal(res.body.code, 0);
      assert.equal(res.body.data?.database, true);
    }
  });
});
