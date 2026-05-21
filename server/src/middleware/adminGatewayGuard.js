const crypto = require('crypto');
const { writeAuditLog } = require('../utils/auditLog');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set([
  '/api/admin/auth/login',
  '/api/admin/auth/refresh',
  '/api/admin/auth/mfa/verify',
  '/api/admin/auth/csrf',
]);

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return '';
  }
}

function getConfiguredAllowedOrigins() {
  const configured = [
    ...splitCsv(process.env.ADMIN_ALLOWED_ORIGINS),
    ...splitCsv(process.env.ADMIN_PUBLIC_URL),
    ...splitCsv(process.env.ADMIN_ORIGIN),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  if (configured.length) return [...new Set(configured)];
  if (process.env.NODE_ENV === 'production') return [];

  return [
    'http://localhost:3000',
    'http://localhost:4173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
  ];
}

function getRequestOriginFromHost(req) {
  const host = req.get('host');
  if (!host) return '';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return normalizeOrigin(`${proto}://${host}`);
}

function getSourceOrigin(req) {
  const origin = normalizeOrigin(req.get('origin'));
  if (origin) return origin;
  return normalizeOrigin(req.get('referer'));
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function auditSecurityBlock(req, reason, extra = {}) {
  await writeAuditLog({
    req,
    operatorId: req.user?.id || null,
    actionType: 'security.admin_gateway_block',
    objectType: 'admin_api',
    objectId: null,
    summary: `Admin API security block: ${reason}`,
    after: {
      reason,
      origin: req.get('origin') || '',
      referer: req.get('referer') || '',
      host: req.get('host') || '',
      ...extra,
    },
    result: 'failure',
    errorMessage: reason,
  });
}

function blockAdminApiOnPublicHost(req, res, next) {
  if (!req.path.startsWith('/api/admin')) return next();
  const allowed = getConfiguredAllowedOrigins();
  const requestOrigin = getRequestOriginFromHost(req);

  if (!allowed.length) {
    if (process.env.NODE_ENV === 'production') {
      void auditSecurityBlock(req, 'admin_allowed_origins_not_configured');
      return res.status(404).json({ code: 404, message: 'Not Found' });
    }
    return next();
  }

  if (!allowed.includes(requestOrigin)) {
    void auditSecurityBlock(req, 'admin_api_public_host', { requestOrigin, allowedOrigins: allowed });
    return res.status(404).json({ code: 404, message: 'Not Found' });
  }

  return next();
}

function adminGatewayGuard(req, res, next) {
  if (!req.path.startsWith('/api/admin')) return next();
  if (req.method === 'OPTIONS') return next();

  const allowed = getConfiguredAllowedOrigins();
  const sourceOrigin = getSourceOrigin(req);
  if (!allowed.length || !sourceOrigin || !allowed.includes(sourceOrigin)) {
    void auditSecurityBlock(req, !sourceOrigin ? 'admin_api_missing_origin' : 'admin_api_origin_denied', {
      sourceOrigin,
      allowedOrigins: allowed,
    });
    return res.status(403).json({ code: 403, message: 'Forbidden' });
  }

  return next();
}

function createCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const secure = process.env.NODE_ENV === 'production'
    || req.secure
    || req.protocol === 'https'
    || req.get('x-forwarded-proto') === 'https';

  res.cookie('admin_csrf_token', token, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: 2 * 60 * 60 * 1000,
    path: '/api/admin',
  });
  return token;
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }
  return '';
}

function adminCsrfGuard(req, res, next) {
  if (!req.path.startsWith('/api/admin')) return next();
  if (SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next();

  const headerToken = String(req.get('x-csrf-token') || '');
  const cookieToken = getCookie(req, 'admin_csrf_token');

  if (!headerToken || !cookieToken || !timingSafeEqualString(headerToken, cookieToken)) {
    void auditSecurityBlock(req, 'admin_csrf_failed', {
      hasHeaderToken: Boolean(headerToken),
      hasCookieToken: Boolean(cookieToken),
    });
    return res.status(403).json({ code: 403, message: 'CSRF token invalid' });
  }

  return next();
}

module.exports = {
  adminGatewayGuard,
  adminCsrfGuard,
  blockAdminApiOnPublicHost,
  createCsrfToken,
  getConfiguredAllowedOrigins,
};
