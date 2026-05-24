const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const {
  adminGatewayGuard,
  blockAdminApiOnPublicHost,
  adminCsrfGuard,
  getConfiguredAllowedOrigins,
} = require('../src/middleware/adminGatewayGuard');

process.env.AUDIT_LOG_DISABLED = '1';

function withEnv(overrides, fn) {
  const previous = {};
  for (const key of Object.keys(overrides)) {
    previous[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }
  return Promise.resolve(fn()).finally(() => {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

function createApp() {
  const app = express();
  app.use(blockAdminApiOnPublicHost);
  app.use(adminGatewayGuard);
  app.use(adminCsrfGuard);
  app.post('/api/admin/auth/login', (req, res) => res.status(200).json({ ok: true }));
  app.get('/api/admin/auth/csrf', (req, res) => res.status(200).json({ ok: true }));
  app.post('/api/admin/auth/mfa/reverify', (req, res) => res.status(200).json({ ok: true }));
  app.post('/api/admin/products', (req, res) => res.status(200).json({ ok: true }));
  return app;
}

test('getConfiguredAllowedOrigins does not include PUBLIC_APP_URL by default in production', () => withEnv({
  NODE_ENV: 'production',
  ADMIN_ALLOWED_ORIGINS: 'https://admin.example.com',
  PUBLIC_APP_URL: 'https://shop.example.com',
}, () => {
  const allowed = getConfiguredAllowedOrigins();
  assert.deepEqual(allowed, [
    'https://admin.example.com',
  ]);
}));

test('getConfiguredAllowedOrigins includes PUBLIC_APP_URL only when compat switch is enabled', () => withEnv({
  NODE_ENV: 'production',
  ADMIN_ALLOWED_ORIGINS: 'https://admin.example.com',
  PUBLIC_APP_URL: 'https://shop.example.com',
  ADMIN_COMPAT_ALLOW_PUBLIC_APP_ORIGIN: '1',
}, () => {
  const allowed = getConfiguredAllowedOrigins();
  assert.deepEqual(allowed, [
    'https://admin.example.com',
    'https://shop.example.com',
  ]);
}));

test('allows login POST without Origin when request Host is allowed', () => withEnv({
  NODE_ENV: 'production',
  ADMIN_ALLOWED_ORIGINS: 'https://shop.example.com',
  PUBLIC_APP_URL: 'https://shop.example.com',
}, async () => {
  const app = createApp();
  const res = await request(app)
    .post('/api/admin/auth/login')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https')
    .send({ phone: '1', password: 'x' });

  assert.equal(res.status, 200);
}));

test('allows GET csrf without Origin when request Host is allowed', () => withEnv({
  NODE_ENV: 'production',
  ADMIN_ALLOWED_ORIGINS: 'https://shop.example.com',
  PUBLIC_APP_URL: 'https://shop.example.com',
}, async () => {
  const app = createApp();
  const res = await request(app)
    .get('/api/admin/auth/csrf')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https');

  assert.equal(res.status, 200);
}));

test('blocks mutating admin API without Origin even when Host is allowed', () => withEnv({
  NODE_ENV: 'production',
  ADMIN_ALLOWED_ORIGINS: 'https://shop.example.com',
  PUBLIC_APP_URL: 'https://shop.example.com',
}, async () => {
  const app = createApp();
  const res = await request(app)
    .post('/api/admin/products')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https')
    .send({ name: 'x' });

  assert.equal(res.status, 403);
}));

test('returns 404 when request Host is not in allowed origins', () => withEnv({
  NODE_ENV: 'production',
  ADMIN_ALLOWED_ORIGINS: 'https://admin.example.com',
  PUBLIC_APP_URL: '',
}, async () => {
  const app = createApp();
  const res = await request(app)
    .get('/api/admin/auth/csrf')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https');

  assert.equal(res.status, 404);
}));

test('allows request when Origin matches allowed list', () => withEnv({
  NODE_ENV: 'production',
  ADMIN_ALLOWED_ORIGINS: 'https://shop.example.com',
  PUBLIC_APP_URL: 'https://shop.example.com',
}, async () => {
  const app = createApp();
  const res = await request(app)
    .post('/api/admin/products')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://shop.example.com')
    .set('X-CSRF-Token', 'token-a')
    .set('Cookie', 'admin_csrf_token=token-a')
    .send({ name: 'x' });

  assert.equal(res.status, 200);
}));

test('requires CSRF for admin MFA reverify', () => withEnv({
  NODE_ENV: 'production',
  ADMIN_ALLOWED_ORIGINS: 'https://shop.example.com',
  PUBLIC_APP_URL: 'https://shop.example.com',
}, async () => {
  const app = createApp();
  const missing = await request(app)
    .post('/api/admin/auth/mfa/reverify')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://shop.example.com')
    .send({ code: '123456' });

  assert.equal(missing.status, 403);

  const ok = await request(app)
    .post('/api/admin/auth/mfa/reverify')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://shop.example.com')
    .set('X-CSRF-Token', 'token-a')
    .set('Cookie', 'admin_csrf_token=token-a')
    .send({ code: '123456' });

  assert.equal(ok.status, 200);
}));
