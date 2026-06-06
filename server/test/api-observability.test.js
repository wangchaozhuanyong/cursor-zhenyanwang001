require('./setupTestEnv').loadTestEnv();
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const apiTimeout = require('../src/middleware/apiTimeout');
const accessLogger = require('../src/middleware/accessLogger');
const requestContext = require('../src/middleware/requestContext');
const analyticsService = require('../src/modules/analytics/service/analytics.service');
const analyticsRepo = require('../src/modules/analytics/repository/analytics.repository');
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

  test('disallowed CORS origin returns 403 instead of leaking a 500', async () => {
    const res = await request(app)
      .get('/api/health/live')
      .set('Origin', 'https://evil.example')
      .expect('Content-Type', /json/)
      .expect(403);

    assert.equal(res.body.code, 403);
    assert.equal(res.body.message, 'CORS not allowed');
  });

  test('encoded traversal under uploads returns 404 instead of SPA fallback', async () => {
    const res = await request(app)
      .get('/uploads/%2e%2e/%2e%2e/server/.env')
      .expect(404);

    assert.doesNotMatch(res.text, /JWT_SECRET|DB_PASSWORD|STRIPE_SECRET_KEY/i);
  });

  test('missing hashed frontend chunks are classified as cache inconsistency in Chinese logs', () => {
    const classification = accessLogger._private.classifyAccessLog(
      { originalUrl: '/assets/AdminOrders-oldhash.js?from=stale-html' },
      { statusCode: 404 },
    );

    assert.equal(classification.categoryCode, 'FRONTEND_STALE_HTML_MISSING_CHUNK');
    assert.equal(classification.category, '前端缓存不一致');
    assert.match(classification.message, /旧 SPA 入口 HTML/);
  });

  test('frontend chunk failure analytics is accepted even on admin pages', async () => {
    const originalInsertEvent = analyticsRepo.insertEvent;
    let inserted = null;
    analyticsRepo.insertEvent = async (row) => {
      inserted = row;
    };

    try {
      const result = await analyticsService.trackEvent(
        {
          event_type: 'frontend_chunk_load_failed',
          path: '/admin/orders',
          page: '/admin/orders',
          keyword: '/assets/AdminOrders-oldhash.js',
          traffic_source: 'auto_recovery',
        },
        {
          headers: { 'user-agent': 'Test Browser' },
          user: { role: 'admin', is_admin: true },
          ip: '127.0.0.1',
        },
      );

      assert.equal(result.message, 'ok');
      assert.equal(inserted.event_type, 'frontend_chunk_load_failed');
      assert.equal(inserted.path, '/admin/orders');
      assert.equal(inserted.keyword, '/assets/AdminOrders-oldhash.js');
    } finally {
      analyticsRepo.insertEvent = originalInsertEvent;
    }
  });

  test('analytics batch accepts valid events and ignores invalid payloads', async () => {
    const originalInsertEvent = analyticsRepo.insertEvent;
    const inserted = [];
    analyticsRepo.insertEvent = async (row) => {
      inserted.push(row);
    };

    try {
      const result = await analyticsService.trackEvents(
        [
          {
            event_type: 'session_start',
            page: '/',
            path: '/',
            anonymous_id: 'anon-1',
            session_id: 'session-1',
          },
          {
            event_type: 'page_view',
            page: '/',
            path: '/',
            anonymous_id: 'anon-1',
            session_id: 'session-1',
          },
          {
            event_type: 'not_allowed',
            page: '/',
          },
        ],
        {
          headers: { 'user-agent': 'Test Browser' },
          ip: '127.0.0.1',
        },
      );

      assert.equal(result.message, 'ok');
      assert.equal(result.data.accepted, 2);
      assert.equal(result.data.ignored, 1);
      assert.deepEqual(inserted.map((row) => row.event_type), ['session_start', 'page_view']);
    } finally {
      analyticsRepo.insertEvent = originalInsertEvent;
    }
  });
});
