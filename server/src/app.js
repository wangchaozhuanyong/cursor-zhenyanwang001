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
const seoRoutes = require('./modules/seo/seo.routes');
const { registerSeoPrerender } = require('./modules/product/seoPrerender');
const stripeWebhook = require('./modules/payment/stripeWebhook.controller');

const app = express();

/**
 * 绾?HTTP锛圛P/鏈笂璇佷功锛夐儴缃叉椂锛孒elmet 榛樿鐨?CSP upgrade-insecure-requests + HSTS
 * 浼氳閮ㄥ垎绉诲姩娴忚鍣ㄦ妸璇锋眰銆屽崌绾с€嶅埌 https://锛屽洜鏃犺瘉涔﹁€岃〃鐜颁负銆岀綉缁滆繛鎺ュけ璐ャ€嶃€? * 浠呭綋 PUBLIC_APP_URL 鏄庣‘涓?https:// 鏃朵繚鐣欏畬鏁村畨鍏ㄥご銆? */
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

/** 鐢熶骇鐜锛氭墭绠?Vite 鏋勫缓浜х墿锛堜笌 API 鍚屾簮锛屽墠绔姹?/api 鏃犻渶璺ㄥ煙锛?*/
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

/** 鍦?Helmet 榛樿 CSP 涓婅ˉ鍏咃細棣栭〉婕旂ず鍥撅紙Unsplash锛夈€丆loudflare Web Analytics 淇℃爣 */
const helmetCspDefaults = helmet.contentSecurityPolicy.getDefaultDirectives();
const storageAllowedOrigins = getStorageAllowedOrigins();
const cspDirectives = {
  ...helmetCspDefaults,
  'img-src': [...helmetCspDefaults['img-src'], 'https://images.unsplash.com', ...storageAllowedOrigins],
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

/** 鍙嶅悜浠ｇ悊锛圢ginx / ALB锛夊悗椤诲紑鍚紝鍚﹀垯闄愭祦涓?req.ip 鍙兘涓嶅噯纭€傜敓浜ч粯璁?1 璺筹紱鏄惧紡 TRUST_PROXY=0 鍏抽棴銆?*/
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

/** Stripe Webhook 蹇呴』浣跨敤 raw body锛岄』鏀惧湪 express.json 涔嬪墠 */
app.post(
  '/api/payment/stripe/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  stripeWebhook.handleWebhook,
);

// 涓?multer 瑙嗛涓婇檺 50MB銆丯ginx client_max_body_size 瀵归綈锛沵ultipart 鐢?multer 瑙ｆ瀽锛屾鏉′富瑕侀伩鍏嶅ぇ JSON 鎰忓 413
app.use(express.json({ limit: '60mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(seoRoutes);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { code: 429, message: '璇锋眰杩囦簬棰戠箒锛岃绋嶅悗鍐嶈瘯' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/auth/login', authLimiter);

const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: 429, message: '鏁忔劅鎿嶄綔杩囦簬棰戠箒锛岃绋嶅悗鍐嶈瘯' },
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
  message: { code: 429, message: 'OAuth 璇锋眰杩囦簬棰戠箒锛岃绋嶅悗鍐嶈瘯' },
});
app.use('/api/auth/oauth/google/start', oauthStartLimiter);
app.use('/api/auth/wechat/login', oauthStartLimiter);
app.use('/api/auth/wechat/bind-phone', authSensitiveLimiter);
app.use('/api/auth/wechat/otp/send', authSensitiveLimiter);
app.use('/api/me/bind-wechat', oauthStartLimiter);

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: 429, message: '涓婁紶杩囦簬棰戠箒锛岃绋嶅悗鍐嶈瘯' },
});
app.use('/api/upload', uploadLimiter);
app.use('/api/admin/upload', uploadLimiter);

app.use(responseMiddleware);
app.use('/api', routes);

/** dist 瀛樺湪涓旀湭璁剧疆 SERVE_SPA=0 鏃舵墭绠″墠绔紙浠呰窇 API 鏃跺彲鍦?.env 鍐?SERVE_SPA=0锛?*/
const serveSpa = fs.existsSync(frontendDist) && process.env.SERVE_SPA !== '0';
if (serveSpa) {
  const frontendAssetsDir = path.join(frontendDist, 'assets');

  // Hashed build artifacts can be long-cached safely.
  app.use(
    '/assets',
    express.static(frontendAssetsDir, {
      immutable: true,
      maxAge: '30d',
    }),
  );

  // 鍏紑鍟嗗搧/鍒嗙被璺敱杩斿洖甯?meta 涓庢鏂囨憳瑕佺殑 HTML 澹筹紝缂撹В SPA 棣栧睆鏃犳硶琚埇铏鍙栥€?  registerSeoPrerender(app, { frontendDist });

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
  // Express 5 / path-to-regexp 涓嶆敮鎸?app.get('*')锛岀敤涓棿浠跺仛 SPA 鍥為€€
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    // Missing hashed chunks must be a real 404; returning index.html makes
    // dynamic import failures harder to diagnose and can cache the wrong MIME.
    if (req.path.startsWith('/assets/')) return next();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => next(err));
  });
  console.log(`馃摝 鍓嶇闈欐€佽祫婧? ${frontendDist}`);
}

app.use(errorHandler);

module.exports = app;

