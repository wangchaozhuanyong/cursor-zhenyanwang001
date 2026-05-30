require('./setupTestEnv').loadTestEnv();
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const apiTimeout = require('../src/middleware/apiTimeout');
const requestContext = require('../src/middleware/requestContext');
const {
  REDACTED,
  redactString,
  sanitizeLogValue,
} = require('../src/utils/logRedaction');

describe('API observability guardrails', () => {
  test('unknown /api routes return the unified JSON 404 envelope with traceId', async () => {
    const res = await request(app)
      .get('/api/definitely-not-found?token=secret-token')
      .set('X-Trace-Id', 'test-trace-404')
      .expect('Content-Type', /json/)
      .expect(404);

    assert.equal(res.body.code, 404);
    assert.equal(res.body.data, null);
    assert.equal(res.body.traceId, 'test-trace-404');
    assert.equal(res.headers['x-trace-id'], 'test-trace-404');
  });

  test('log redaction masks sensitive keys and token-shaped strings', () => {
    const sanitized = sanitizeLogValue({
      username: 'admin',
      password: 'PlainTextPassword1',
      nested: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
      },
    });

    assert.equal(sanitized.username, 'admin');
    assert.equal(sanitized.password, REDACTED);
    assert.equal(sanitized.nested.accessToken, REDACTED);

    const text = redactString(
      'Authorization: Bearer abcdefghijklmnopqrstuvwxyz token=secret-token password=PlainTextPassword1 {"apiKey":"json-secret"}',
    );
    assert.doesNotMatch(text, /abcdefghijklmnopqrstuvwxyz/);
    assert.doesNotMatch(text, /secret-token/);
    assert.doesNotMatch(text, /PlainTextPassword1/);
    assert.doesNotMatch(text, /json-secret/);
    assert.match(text, /\[REDACTED\]/);
  });

  test('API timeout returns unified JSON instead of hanging forever', async () => {
    const slowApp = express();
    slowApp.use(requestContext);
    slowApp.use('/api', apiTimeout({ timeoutMs: 5 }));
    slowApp.get('/api/slow', (_req, res) => {
      setTimeout(() => res.json({ ok: true }), 30);
    });

    const res = await request(slowApp)
      .get('/api/slow')
      .set('X-Trace-Id', 'test-trace-timeout')
      .expect('Content-Type', /json/)
      .expect(504);

    assert.equal(res.body.code, 504);
    assert.equal(res.body.data, null);
    assert.equal(res.body.traceId, 'test-trace-timeout');
    assert.equal(res.headers['x-trace-id'], 'test-trace-timeout');
  });
});
