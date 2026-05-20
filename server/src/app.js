// @ts-nocheck
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const responseMiddleware = require('./middleware/response');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const seoRoutes = require('./modules/seo/routes/seo.routes');
const { registerSeoPrerender } = require('./modules/product/seoPrerender');
const { registerPwaBrandRoutes } = require('./modules/pwa/routes/pwa.routes');
const stripeWebhook = require('./modules/payment/controller/stripeWebhook.controller');

const app = express();

app.use((req, res, next) => {
  res.charset = 'utf-8';
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag', 'noindex');
  }
  next();
});

/**
 * �?HTTP（IP/未上证书）部署时，Helmet 默认�?CSP upgrade-insecure-requests + HSTS
 * 会让部分移动浏览器把请求「升级」到 https://，因无证书而表现为「网络连接失败」�? * 仅当 PUBLIC_APP_URL 明确�?https:// 时保留完整安全头�? */
const publicUrl = (process.env.PUBLIC_APP_URL || '').trim();
const useHttpsSite = publicUrl.startsWith('https://');

function getStorageAllowedOrigins() {
  const origins = new Set();
  const driver = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();
  if (driver !== 's3') return [];

  const bucket = (process.env.STORAGE_S3_BUCKET || '').trim();
  const region = (process.env.STORAGE_S3_REGION || '').trim();
  const endpoint = (process.env.STORAGE_S3_ENDPOINT || '').trim();

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

/** 生产环境：托�?Vite 构建产物（与 API 同源，前端请�?/api 无需跨域�?*/
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
const viteInlineScriptHashes = getInlineScriptHashesFromHtml(frontendIndexHtml);

/** �?Helmet 默认 CSP 上补充：首页演示图（Unsplash）、Cloudflare Web Analytics 信标 */
const helmetCspDefaults = helmet.contentSecurityPolicy.getDefaultDirectives();
const storageAllowedOrigins = getStorageAllowedOrigins();
const cspDirectives = {
  ...helmetCspDefaults,
  'img-src': [...helmetCspDefaults['img-src'], 'blob:', 'https://images.unsplash.com', ...storageAllowedOrigins],
  'script-src': [
    ...helmetCspDefaults['script-src'],
    'data:',
    'https://static.cloudflareinsights.com',
    'https://js.stripe.com',
    ...viteInlineScriptHashes,
  ],
  'connect-src': [
    "'self'",
    'https://cloudflareinsights.com',
    'https://static.cloudflareinsights.com',
    'https://api.stripe.com',
  ],
  'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
};
if (!useHttpsSite) {
  cspDirectives['upgrade-insecure-requests'] = null;
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: { directives: cspDirectives },
    ...(!useHttpsSite ? { strictTransportSecurity: false } : {}),
  }),
);

const isProduction = process.env.NODE_ENV === 'production';

/** 反向代理（Nginx / ALB）后须开启，否则限流�?req.ip 可能不准确。生产默�?1 跳；显式 TRUST_PROXY=0 关闭�?*/
const trustProxyRaw = (process.env.TRUST_PROXY ?? '').trim();
if (trustProxyRaw === '0' || trustProxyRaw.toLowerCase() === 'false') {
  // leave Express default (false)
} else if (isProduction) {
  app.set('trust proxy', trustProxyRaw === '' ? 1 : (Number(trustProxyRaw) || trustProxyRaw));
} else if (trustProxyRaw) {
  app.set('trust proxy', Number(trustProxyRaw) || trustProxyRaw);
}

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173,http://localhost:8080,http://localhost:8081,http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowDevAnyOrigin = !isProduction && process.env.ALLOW_DEV_CORS_ANY_ORIGIN === '1';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (allowDevAnyOrigin) return callback(null, true);
    callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
}));

app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(require('morgan')('combined'));
}

/** Stripe Webhook 必须使用 raw body，须放在 express.json 之前 */
app.post(
  '/api/payment/stripe/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  stripeWebhook.handleWebhook,
);

// �?multer 视频上限 50MB、Nginx client_max_body_size 对齐；multipart �?multer 解析，此条主要避免大 JSON 意外 413
app.use(express.json({ limit: '60mb' }));

const uploadsDir = path.join(__dirname, '../public/uploads');
/** ��ʷ��Ʒ���ܽ��� full.webp���� -card/-detail��ȱʧ����ʱ���� full������ͻ��� 404 �������� */
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
app.use('/api/auth/password-reset/request', authSensitiveLimiter);
app.use('/api/auth/password-reset/confirm', authSensitiveLimiter);
app.use('/api/auth/refresh', authSensitiveLimiter);
app.use('/api/admin/auth/refresh', authSensitiveLimiter);
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

const paymentWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { code: 429, message: 'Webhook 请求过于频繁，请稍后再试' },
});
app.use('/api/payments/webhooks', paymentWebhookLimiter);

app.use(responseMiddleware);
app.use('/api', routes);

/** dist 存在且未设置 SERVE_SPA=0 时托管前端（仅跑 API 时可�?.env �?SERVE_SPA=0�?*/
const serveSpa = fs.existsSync(frontendDist) && process.env.SERVE_SPA !== '0';
if (serveSpa) {
  const frontendAssetsDir = path.join(frontendDist, 'assets');

  // PWA install identity must follow admin-configured site logo/name, not the build-time bundled icon.
  registerPwaBrandRoutes(app, { frontendDist });

  // Hashed build artifacts can be long-cached safely.
  app.use(
    '/assets',
    express.static(frontendAssetsDir, {
      immutable: true,
      maxAge: '30d',
    }),
  );

  // Public routes return an SEO-ready HTML shell before the SPA fallback.
  registerSeoPrerender(app, { frontendDist });

  // HTML entry should always revalidate to avoid stale chunk references.
  app.use(
    express.static(frontendDist, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          return;
        }
        if (!filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=300');
        }
      },
    }),
  );
  // Express 5 / path-to-regexp 不支�?app.get('*')，用中间件做 SPA 回退
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    // Missing hashed chunks must be a real 404; returning index.html makes
    // dynamic import failures harder to diagnose and can cache the wrong MIME.
    if (req.path.startsWith('/assets/')) return next();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => next(err));
  });
  console.log(`前端静态资源目录: ${frontendDist}`);
}

app.use(errorHandler);

module.exports = app;
