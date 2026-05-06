const rateLimit = require('express-rate-limit');

function clientKey(req) {
  // 登录后优先按用户维度限流，否则按 IP
  return req.user?.id || req.ip;
}

/** 普通 API：1 分钟最多 100 次 */
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
});

/** 敏感“用户查询/用户资料”类：1 分钟最多 20 次 */
const userQueryLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
});

module.exports = {
  generalApiLimiter,
  userQueryLimiter,
};

