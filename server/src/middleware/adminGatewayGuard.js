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

function normalizeAdminApiPath(path) {
  const normalized = String(path || '');
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function getConfiguredAllowedOrigins() {
  const configured = splitCsv(process.env.ADMIN_ALLOWED_ORIGINS)
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    configured.push(
      ...splitCsv(process.env.ADMIN_PUBLIC_URL).map(normalizeOrigin).filter(Boolean),
      ...splitCsv(process.env.ADMIN_ORIGIN).map(normalizeOrigin).filter(Boolean),
    );
  }

  if (process.env.ADMIN_COMPAT_ALLOW_PUBLIC_APP_ORIGIN === '1') {
    const publicAppOrigin = normalizeOrigin(process.env.PUBLIC_APP_URL);
    if (publicAppOrigin) configured.push(publicAppOrigin);
  }

  const unique = [...new Set(configured)].filter(Boolean);
  if (unique.length) return unique;

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

function buildGatewayContext(req) {
  const allowed = getConfiguredAllowedOrigins();
  return {
    requestOrigin: getRequestOriginFromHost(req),
    sourceOrigin: getSourceOrigin(req),
    allowedOrigins: allowed,
    host: req.get('host') || '',
    path: req.path,
    method: req.method,
  };
}

function logAdminGatewayDeny(req, reason, extra = {}) {
  const context = {
    reason,
    ...buildGatewayContext(req),
    ...extra,
  };
  console.warn('[admin-gateway] blocked request', JSON.stringify(context));
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
      ...buildGatewayContext(req),
      ...extra,
    },
    result: 'failure',
    errorMessage: reason,
  });
}

function denyAdminGateway(req, res, {
  reason,
  statusCode,
  message,
  extra = {},
}) {
  logAdminGatewayDeny(req, reason, extra);
  void auditSecurityBlock(req, reason, extra);
  return res.status(statusCode).json({ code: statusCode, message });
}

function blockAdminApiOnPublicHost(req, res, next) {
  if (!req.path.startsWith('/api/admin')) return next();

  const allowed = getConfiguredAllowedOrigins();
  const requestOrigin = getRequestOriginFromHost(req);

  if (!allowed.length) {
    if (process.env.NODE_ENV === 'production') {
      return denyAdminGateway(req, res, {
        reason: 'admin_allowed_origins_not_configured',
        statusCode: 404,
        message: 'Not Found',
      });
    }
    return next();
  }

  if (!requestOrigin || !allowed.includes(requestOrigin)) {
    return denyAdminGateway(req, res, {
      reason: 'admin_api_host_not_allowed',
      statusCode: 404,
      message: 'Not Found',
      extra: { requestOrigin },
    });
  }

  return next();
}

function adminGatewayGuard(req, res, next) {
  if (!req.path.startsWith('/api/admin')) return next();
  if (req.method === 'OPTIONS') return next();

  const allowed = getConfiguredAllowedOrigins();
  const requestOrigin = getRequestOriginFromHost(req);
  const sourceOrigin = getSourceOrigin(req);
  const apiPath = normalizeAdminApiPath(req.path);

  if (!allowed.length) {
    if (process.env.NODE_ENV === 'production') {
      return denyAdminGateway(req, res, {
        reason: 'admin_allowed_origins_not_configured',
        statusCode: 403,
        message: 'Forbidden',
      });
    }
    return next();
  }

  if (!requestOrigin || !allowed.includes(requestOrigin)) {
    return denyAdminGateway(req, res, {
      reason: 'admin_api_host_not_allowed',
      statusCode: 403,
      message: 'Forbidden',
      extra: { requestOrigin },
    });
  }

  if (sourceOrigin && !allowed.includes(sourceOrigin)) {
    return denyAdminGateway(req, res, {
      reason: 'admin_api_origin_denied',
      statusCode: 403,
      message: 'Forbidden',
      extra: { sourceOrigin },
    });
  }

  if (!sourceOrigin) {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }
    if (CSRF_EXEMPT_PATHS.has(apiPath)) {
      return next();
    }
    return denyAdminGateway(req, res, {
      reason: 'admin_api_missing_origin',
      statusCode: 403,
      message: 'Forbidden',
    });
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
  if (CSRF_EXEMPT_PATHS.has(normalizeAdminApiPath(req.path))) return next();

  const headerToken = String(req.get('x-csrf-token') || '');
  const cookieToken = getCookie(req, 'admin_csrf_token');

  if (!headerToken || !cookieToken || !timingSafeEqualString(headerToken, cookieToken)) {
    logAdminGatewayDeny(req, 'admin_csrf_failed', {
      hasHeaderToken: Boolean(headerToken),
      hasCookieToken: Boolean(cookieToken),
    });
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
  normalizeAdminApiPath,
};
