// @ts-nocheck
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const requestContext = require('./middleware/requestContext');
const accessLogger = require('./middleware/accessLogger');
const apiTimeout = require('./middleware/apiTimeout');
const serverTiming = require('./middleware/serverTiming');
const responseMiddleware = require('./middleware/response');
const errorHandler = require('./middleware/errorHandler');
const apiNotFound = require('./middleware/apiNotFound');
const {
  adminGatewayGuard,
  adminCsrfGuard,
  blockAdminApiOnPublicHost,
} = require('./middleware/adminGatewayGuard');
const routes = require('./routes');
const seoRoutes = require('./modules/seo/routes/seo.routes');
const { registerSeoPrerender } = require('./modules/product/seoPrerender');
const { registerPwaBrandRoutes } = require('./modules/pwa/routes/pwa.routes');
const stripeWebhook = require('./modules/payment/controller/stripeWebhook.controller');
const { ForbiddenError } = require('./errors');
const { runWithRequestPerf } = require('./utils/requestPerf');
const {
  ROBOTS_NOINDEX_NOFOLLOW,
  resolvePublicSpaRobotsHeader,
  setNoStoreHtmlHeaders,
} = require('./utils/seoHeaders');

const app = express();

app.use(requestContext);
app.use((req, res, next) => runWithRequestPerf(next));
app.use(accessLogger);

app.use((req, res, next) => {
  res.charset = 'utf-8';
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag', ROBOTS_NOINDEX_NOFOLLOW);
  }
  next();
});

/**
 * When serving over plain HTTP, do not force upgrade-insecure-requests or HSTS.
 * Keep the stricter HTTPS-only headers only when PUBLIC_APP_URL is https://.
 */
const publicUrl = (process.env.PUBLIC_APP_URL || '').trim();
const useHttpsSite = publicUrl.startsWith('https://');

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    const normalized = String(value).trim();
    if (!normalized) return null;
    return new URL(normalized).origin;
  } catch {
    return null;
  }
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPreviewFrameOrigins() {
  return Array.from(new Set([
    normalizeOrigin(process.env.PUBLIC_APP_URL),
    normalizeOrigin(process.env.ADMIN_PUBLIC_URL),
    normalizeOrigin(process.env.ADMIN_FRONTEND_URL),
    ...splitCsv(process.env.ADMIN_ALLOWED_ORIGINS).map(normalizeOrigin),
  ].filter(Boolean)));
}

function getAdminFrameAncestorOrigins() {
  return Array.from(new Set([
    normalizeOrigin(process.env.ADMIN_PUBLIC_URL),
    normalizeOrigin(process.env.ADMIN_FRONTEND_URL),
    ...splitCsv(process.env.ADMIN_ALLOWED_ORIGINS).map(normalizeOrigin),
  ].filter(Boolean)));
}

function getStorageAllowedOrigins() {
  const origins = new Set();
  const driver = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();
  if (driver !== 's3') return [];

  const bucket = (process.env.STORAGE_S3_BUCKET || '').trim();
  const region = (process.env.STORAGE_S3_REGION || '').trim();
  const endpoint = (process.env.STORAGE_S3_ENDPOINT || '').trim();
  const publicBaseUrl = (process.env.STORAGE_PUBLIC_BASE_URL || '').trim();

  if (bucket && region) {
    origins.add(`https://${bucket}.s3.${region}.amazonaws.com`);
  }

  if (endpoint) {
    try {
      const normalized = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
      origins.add(new URL(normalized).origin);
    } catch {
      // ignore invalid endpoint
    }
  }

  if (publicBaseUrl) {
    try {
      const normalized = publicBaseUrl.startsWith('http') ? publicBaseUrl : `https://${publicBaseUrl}`;
      origins.add(new URL(normalized).origin);
    } catch {
      // ignore invalid public base URL
    }
  }

  return Array.from(origins);
}

function getInlineScriptHashesFromHtml(htmlPath) {
  try {
    if (!htmlPath || !fs.existsSync(htmlPath)) return [];
    const html = fs.readFileSync(htmlPath, 'utf8');
    const hashes = [];
    const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = re.exec(html))) {
      const content = match[1];
      if (!content || !content.trim()) continue;
      const digest = crypto.createHash('sha256').update(content, 'utf8').digest('base64');
      hashes.push(`'sha256-${digest}'`);
    }
    return hashes;
  } catch {
    return [];
  }
}

/** Serve the Vite build from the same origin as the API in production. */
const defaultFrontendDist = path.join(
  __dirname,
  '..',
  '..',
  'click-send-shop-main',
  'click-send-shop-main',
  'dist',
);
const frontendDist = process.env.FRONTEND_DIST || defaultFrontendDist;
const frontendIndexHtml = path.join(frontendDist, 'index.html');

const defaultAdminDist = path.join(
  __dirname,
  '..',
  '..',
  'click-send-shop-main',
  'click-send-shop-main',
  'admin-dist',
);
const adminDist = process.env.ADMIN_DIST || defaultAdminDist;
const adminDistIndexHtml = ['index.html', 'admin-index.html']
  .map((name) => path.join(adminDist, name))
  .find((filePath) => fs.existsSync(filePath)) || path.join(adminDist, 'admin-index.html');
const adminDistReady = fs.existsSync(adminDistIndexHtml);
const viteInlineScriptHashes = Array.from(new Set([
  ...getInlineScriptHashesFromHtml(frontendIndexHtml),
  ...getInlineScriptHashesFromHtml(adminDistIndexHtml),
]));

const HASHED_ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const SHORT_STATIC_CACHE_CONTROL = 'public, max-age=300';

function decodePathRepeatedly(rawPath) {
  let current = String(rawPath || '');
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) return decoded;
      current = decoded;
    } catch {
      return current;
    }
  }
  return current;
}

function isUnsafeUploadsPath(req) {
  const rawPath = String(req.originalUrl || req.url || '').split(/[?#]/, 1)[0];
  if (!/^\/uploads(?:\/|$|%2f|%5c)/i.test(rawPath)) return false;
  const decodedPath = decodePathRepeatedly(rawPath).replace(/\\/g, '/');
  return decodedPath.split('/').some((segment) => segment === '..');
}

function setHashedAssetHeaders(res) {
  res.setHeader('Cache-Control', HASHED_ASSET_CACHE_CONTROL);
}

function setSpaStaticHeaders(res, filePath) {
  if (filePath.endsWith('.html')) {
    setNoStoreHtmlHeaders(res);
    return;
  }
  if (path.basename(filePath) === 'sw.js') {
    setNoStoreHtmlHeaders(res);
    return;
  }
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    setHashedAssetHeaders(res);
    return;
  }
  res.setHeader('Cache-Control', SHORT_STATIC_CACHE_CONTROL);
}

function setAdminSpaStaticHeaders(res, filePath) {
  if (filePath.endsWith('.html')) {
    setNoStoreHtmlHeaders(res, { robots: ROBOTS_NOINDEX_NOFOLLOW });
    return;
  }
  if (path.basename(filePath) === 'sw.js') {
    setNoStoreHtmlHeaders(res, { robots: ROBOTS_NOINDEX_NOFOLLOW });
    return;
  }
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    setHashedAssetHeaders(res);
    return;
  }
  res.setHeader('Cache-Control', SHORT_STATIC_CACHE_CONTROL);
}

function isSensitiveFileProbe(req) {
  const rawPath = String(req.originalUrl || req.url || '').split(/[?#]/)[0];
  const normalizedPath = String(req.path || '');
  if (/(?:^|\/|%2f)(?:\.\.|%2e%2e)(?:\/|%2f|$)/i.test(rawPath)) return true;
  if (/(^|\/)\.[^/]+/i.test(normalizedPath)) return true;
  return /\.(?:env|pem|key|crt|pfx|p12|sql|sqlite|db|log|bak|zip|tar|gz|7z|rar)$/i.test(normalizedPath);
}

/** Extend Helmet CSP for configured image storage, analytics, and Stripe. */
const helmetCspDefaults = helmet.contentSecurityPolicy.getDefaultDirectives();
const storageAllowedOrigins = getStorageAllowedOrigins();
const previewFrameOrigins = getPreviewFrameOrigins();
const adminFrameAncestorOrigins = getAdminFrameAncestorOrigins();
const cspDirectives = {
  ...helmetCspDefaults,
  'img-src': [
    ...helmetCspDefaults['img-src'],
    'blob:',
    // Meta Pixel 可能通过 image beacon 方式上报
    'https://www.facebook.com',
    // 生产媒体 CDN：商品图、站点 Logo、favicon 等会通过该域名访问
    'https://cdn.damatong.net',
    ...storageAllowedOrigins,
  ],
  'script-src': [
    ...helmetCspDefaults['script-src'],
    'https://static.cloudflareinsights.com',
    'https://js.stripe.com',
    // 站点统计/广告追踪（按需加载脚本）
    'https://www.googletagmanager.com',
    'https://connect.facebook.net',
    ...viteInlineScriptHashes,
  ],
  'connect-src': [
    "'self'",
    'https://cloudflareinsights.com',
    'https://static.cloudflareinsights.com',
    'https://api.stripe.com',
    // GA4 上报
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
    'https://analytics.google.com',
    // Meta Pixel 上报（部分浏览器走 fetch）
    'https://www.facebook.com',
  ],
  'frame-src': ["'self'", ...previewFrameOrigins, 'https://js.stripe.com', 'https://hooks.stripe.com'],
  'frame-ancestors': ["'self'", ...adminFrameAncestorOrigins],
};
if (!useHttpsSite) {
  cspDirectives['upgrade-insecure-requests'] = null;
}

const helmetBaseOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  ...(!useHttpsSite ? { strictTransportSecurity: false } : {}),
};
const helmetWithCsp = helmet({
  ...helmetBaseOptions,
  contentSecurityPolicy: { directives: cspDirectives },
});
const helmetNoCsp = helmet({
  ...helmetBaseOptions,
  // /tiktok 由后端返回 HTML（用于 noindex），但 CSP 会拦截 Vite module/legacy 探测导致白屏；
  // 只对该入口关闭 CSP，避免影响其他页面与 API 的安全策略。
  contentSecurityPolicy: false,
});
app.use((req, res, next) => {
  if (req.path === '/tiktok' || req.path === '/tiktok/') return helmetNoCsp(req, res, next);
  return helmetWithCsp(req, res, next);
});

const isProduction = process.env.NODE_ENV === 'production';

/** Configure trust proxy so rate limiting uses the real client IP behind Nginx or ALB. */
const trustProxyRaw = (process.env.TRUST_PROXY ?? '').trim();
if (trustProxyRaw === '0' || trustProxyRaw.toLowerCase() === 'false') {
  // leave Express default (false)
} else if (isProduction) {
  app.set('trust proxy', trustProxyRaw === '' ? 1 : (Number(trustProxyRaw) || trustProxyRaw));
} else if (trustProxyRaw) {
  app.set('trust proxy', Number(trustProxyRaw) || trustProxyRaw);
}

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5177',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
].join(',');
const allowedOrigins = (process.env.CORS_ORIGINS || defaultCorsOrigins)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (!isProduction) {
  for (const origin of defaultCorsOrigins.split(',').map((item) => item.trim()).filter(Boolean)) {
    if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  }
}
for (const origin of (process.env.ADMIN_ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean)) {
  if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
}
const allowDevAnyOrigin = !isProduction && process.env.ALLOW_DEV_CORS_ANY_ORIGIN === '1';

/** Dev: treat localhost and 127.0.0.1 on the same port as equivalent. */
function isSameHostOrigin(origin, req) {
  if (!origin || !req) return false;
  try {
    const originUrl = new URL(origin);
    const host = String(req.headers.host || '').trim();
    return Boolean(host) && originUrl.host === host;
  } catch {
    return false;
  }
}

function isAllowedCorsOrigin(origin, req) {
  if (!origin || allowedOrigins.includes(origin)) return true;
  // Module scripts and styles may send an Origin header even for same-host requests.
  // Same-host assets must not be rejected by the API CORS allowlist.
  if (isSameHostOrigin(origin, req)) return true;
  if (!isProduction) {
    try {
      const u = new URL(origin);
      const portSuffix = u.port ? `:${u.port}` : '';
      if (u.hostname === '127.0.0.1') {
        const twin = `${u.protocol}//localhost${portSuffix}`;
        if (allowedOrigins.includes(twin)) return true;
      }
      if (u.hostname === 'localhost') {
        const twin = `${u.protocol}//127.0.0.1${portSuffix}`;
        if (allowedOrigins.includes(twin)) return true;
      }
    } catch {
      /* ignore malformed Origin */
    }
  }
  return allowDevAnyOrigin;
}

app.use(cors((req, callback) => {
  callback(null, {
    origin: (origin, originCallback) => {
      if (isAllowedCorsOrigin(origin, req)) return originCallback(null, true);
      originCallback(new ForbiddenError('CORS not allowed'), false);
    },
    credentials: true,
  });
}));

app.use(compression());
app.use(blockAdminApiOnPublicHost);
app.use(adminGatewayGuard);

const paymentWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { code: 429, message: 'Webhook 请求过于频繁，请稍后再试' },
});

/** Stripe Webhook requires the raw body and must be registered before express.json. */
app.post(
  '/api/payment/stripe/webhook',
  paymentWebhookLimiter,
  express.raw({ type: 'application/json', limit: '1mb' }),
  stripeWebhook.handleWebhook,
);

// Multipart uploads are parsed by multer; keep JSON small to reduce memory pressure.
app.use('/api', serverTiming());
app.use('/api', apiTimeout());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || '1mb' }));
app.use(adminCsrfGuard);

const uploadsDir = path.join(__dirname, '../public/uploads');
app.use((req, res, next) => {
  if (!isUnsafeUploadsPath(req)) return next();
  return res.status(404).send('Not Found');
});
/**
 * @deprecated Legacy local /uploads compatibility.
 * Keep until DB URLs and production access logs show no local-upload traffic.
 * Fall back to full.webp when legacy product card/detail variants are missing.
 */
app.use('/uploads', (req, res, next) => {
  const rel = decodeURIComponent(String(req.path || ''));
  const variantMatch = rel.match(/^\/([a-f0-9]{32})-(card|detail)(\.webp)$/i);
  if (!variantMatch) return next();
  const fullRel = `/${variantMatch[1]}${variantMatch[3]}`;
  const fullDisk = path.join(uploadsDir, fullRel.replace(/^\//, ''));
  if (!fs.existsSync(fullDisk)) return next();
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  return res.sendFile(fullDisk);
});
app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '7d',
    immutable: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.webp')) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      }
    },
  }),
);
app.use('/uploads', (_req, res) => {
  res.status(404).send('Not Found');
});
app.use(seoRoutes);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/auth/login', authLimiter);

const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: 429, message: '敏感操作过于频繁，请稍后再试' },
});
const authRefreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { code: 429, message: '会话刷新过于频繁，请稍后再试' },
});
app.use('/api/auth/password-reset/request', authSensitiveLimiter);
app.use('/api/auth/password-reset/confirm', authSensitiveLimiter);
app.use('/api/auth/refresh', authRefreshLimiter);
app.use('/api/admin/auth/refresh', authRefreshLimiter);
app.use('/api/auth/otp/send', authSensitiveLimiter);
app.use('/api/auth/otp/login', authLimiter);
app.use('/api/auth/oauth/exchange', authSensitiveLimiter);
app.use('/api/user/account/cancel', authSensitiveLimiter);

const oauthStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { code: 429, message: 'OAuth 请求过于频繁，请稍后再试' },
});
app.use('/api/auth/oauth/google/start', oauthStartLimiter);
app.use('/api/auth/wechat/login', oauthStartLimiter);
app.use('/api/auth/wechat/bind-phone', authSensitiveLimiter);
app.use('/api/auth/wechat/otp/send', authSensitiveLimiter);
app.use('/api/me/bind-wechat', oauthStartLimiter);

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: 429, message: '上传过于频繁，请稍后再试' },
});
app.use('/api/upload', uploadLimiter);
app.use('/api/admin/upload', uploadLimiter);


app.use(responseMiddleware);
app.use('/api', routes);
app.use('/api', apiNotFound);

/** Serve the SPA when the build exists, unless SERVE_SPA=0 is set. */
const serveSpa = fs.existsSync(frontendDist) && process.env.SERVE_SPA !== '0';
const serveAdminSpaDisabled = process.env.SERVE_ADMIN_SPA === '0';
const serveAdminFromAdminDist = adminDistReady && !serveAdminSpaDisabled;
const serveAdminFromMainSpa = serveSpa && !serveAdminSpaDisabled && !serveAdminFromAdminDist;

if (serveAdminFromAdminDist) {
  const adminAssetsDir = path.join(adminDist, 'assets');
  if (fs.existsSync(adminAssetsDir)) {
    app.use(
      '/assets',
      express.static(adminAssetsDir, {
        fallthrough: true,
        immutable: true,
        maxAge: '1y',
        setHeaders: setHashedAssetHeaders,
      }),
    );
  }
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path !== '/admin' && !req.path.startsWith('/admin/')) return next();
    setNoStoreHtmlHeaders(res, { robots: ROBOTS_NOINDEX_NOFOLLOW });
    return res.sendFile(adminDistIndexHtml, (err) => next(err));
  });
}

if (serveSpa) {
  const frontendAssetsDir = path.join(frontendDist, 'assets');

  // PWA install identity must follow admin-configured site logo/name, not the build-time bundled icon.
  registerPwaBrandRoutes(app, { frontendDist });

  // Hashed build artifacts can be long-cached safely.
  app.use(
    '/assets',
    express.static(frontendAssetsDir, {
      immutable: true,
      maxAge: '1y',
      setHeaders: setHashedAssetHeaders,
    }),
  );

  // Public routes return an SEO-ready HTML shell before the SPA fallback.
  registerSeoPrerender(app, { frontendDist });

  // HTML entry should always revalidate to avoid stale chunk references.
  app.use(
    express.static(frontendDist, {
      setHeaders: setSpaStaticHeaders,
    }),
  );
  // Express 5 / path-to-regexp does not support app.get('*'); use middleware for SPA fallback.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    if (res.headersSent) return next();
    if (serveAdminFromAdminDist && (req.path === '/admin' || req.path.startsWith('/admin/'))) {
      return next();
    }
    if (
      !serveAdminFromMainSpa
      && !serveAdminFromAdminDist
      && (req.path === '/admin' || req.path.startsWith('/admin/'))
    ) {
      return res.status(404).send('Not Found');
    }
    // Missing hashed chunks must be a real 404; returning index.html makes
    // dynamic import failures harder to diagnose and can cache the wrong MIME.
    if (req.path.startsWith('/assets/')) return next();
    if (isSensitiveFileProbe(req)) return next();
    setNoStoreHtmlHeaders(res, { robots: resolvePublicSpaRobotsHeader(req.path) });
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => next(err));
  });
  console.log(`Frontend static assets: ${frontendDist}`);
  if (serveAdminFromMainSpa) {
    console.log('Admin UI: integrated /admin routes from main frontend dist');
  } else if (serveAdminFromAdminDist) {
    console.log(`Admin UI: standalone admin-dist at ${adminDist}`);
  } else if (!serveAdminSpaDisabled) {
    console.warn(
      'Admin UI: /admin is disabled. Set SERVE_ADMIN_SPA=1 for integrated admin routes, or build admin-dist.',
    );
  }
}

if (serveAdminFromAdminDist && !serveSpa) {
  const adminAssetsDir = path.join(adminDist, 'assets');
  if (fs.existsSync(adminAssetsDir)) {
    app.use(
      '/assets',
      express.static(adminAssetsDir, {
        immutable: true,
        maxAge: '1y',
        setHeaders: setHashedAssetHeaders,
      }),
    );
  }
  app.use(
    express.static(adminDist, {
      setHeaders: setAdminSpaStaticHeaders,
    }),
  );
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/assets/')) return next();
    if (isSensitiveFileProbe(req)) return next();
    setNoStoreHtmlHeaders(res, { robots: ROBOTS_NOINDEX_NOFOLLOW });
    res.sendFile(adminDistIndexHtml, (err) => next(err));
  });
}

app.use(errorHandler);

module.exports = app;
