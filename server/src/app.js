const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const responseMiddleware = require('./middleware/response');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const stripeWebhook = require('./modules/order/stripeWebhook.controller');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173,http://localhost:8080,http://localhost:8081,http://localhost:3000,http://127.0.0.1:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (isProduction) return callback(new Error('CORS not allowed'), false);
    callback(null, true);
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

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/auth/login', authLimiter);

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: 429, message: '上传过于频繁，请稍后再试' },
});
app.use('/api/upload', uploadLimiter);

app.use(responseMiddleware);
app.use('/api', routes);

/** 生产环境：托管 Vite 构建产物（与 API 同源，前端请求 /api 无需跨域） */
const defaultFrontendDist = path.join(
  __dirname,
  '..',
  '..',
  'click-send-shop-main',
  'click-send-shop-main',
  'dist',
);
const frontendDist = process.env.FRONTEND_DIST || defaultFrontendDist;
/** dist 存在且未设置 SERVE_SPA=0 时托管前端（仅跑 API 时可在 .env 写 SERVE_SPA=0） */
const serveSpa = fs.existsSync(frontendDist) && process.env.SERVE_SPA !== '0';
if (serveSpa) {
  app.use(express.static(frontendDist));
  // Express 5 / path-to-regexp 不支持 app.get('*')，用中间件做 SPA 回退
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => next(err));
  });
  console.log(`📦 前端静态资源: ${frontendDist}`);
}

app.use(errorHandler);

module.exports = app;
