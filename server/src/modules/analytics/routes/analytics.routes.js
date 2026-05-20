const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const ctrl = require('../controller/analytics.controller');
const authOptional = require('../../../middleware/authOptional');

const router = Router();

const analyticsIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '埋点请求过于频繁，请稍后再试' },
});

const analyticsAnonymousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.body?.anonymous_id,
  keyGenerator: (req) => String(req.body?.anonymous_id || ''),
  message: { code: 429, message: '埋点请求过于频繁，请稍后再试' },
});

router.post('/events', analyticsIpLimiter, analyticsAnonymousLimiter, authOptional, ctrl.track);

module.exports = router;

