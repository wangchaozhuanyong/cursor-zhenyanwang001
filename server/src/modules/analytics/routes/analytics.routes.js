const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const ctrl = require('../controller/analytics.controller');
const authOptional = require('../../../middleware/authOptional');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');

const router = Router();
const RATE_LIMIT_MESSAGE = { code: 429, message: '埋点请求过于频繁，请稍后再试' };
const TRAFFIC_ANALYTICS_DISABLED_MESSAGE = '流量分析功能已关闭';

const analyticsIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
});

function getAnalyticsAnonymousId(req) {
  if (req.body?.anonymous_id) return req.body.anonymous_id;
  const events = Array.isArray(req.body) ? req.body : req.body?.events;
  if (!Array.isArray(events)) return '';
  const firstWithAnonymousId = events.find((event) => event?.anonymous_id);
  return firstWithAnonymousId?.anonymous_id || '';
}

const analyticsAnonymousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !getAnalyticsAnonymousId(req),
  keyGenerator: (req) => String(getAnalyticsAnonymousId(req)),
  message: RATE_LIMIT_MESSAGE,
});

router.post(
  '/events/batch',
  requireSiteCapability('trafficAnalyticsEnabled', TRAFFIC_ANALYTICS_DISABLED_MESSAGE),
  analyticsIpLimiter,
  analyticsAnonymousLimiter,
  authOptional,
  ctrl.trackBatch,
);

router.post(
  '/events',
  requireSiteCapability('trafficAnalyticsEnabled', TRAFFIC_ANALYTICS_DISABLED_MESSAGE),
  analyticsIpLimiter,
  analyticsAnonymousLimiter,
  authOptional,
  ctrl.track,
);

module.exports = router;
