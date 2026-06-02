const { safeStringifyForLog, sanitizeLogValue } = require('../utils/logRedaction');

function getRequestPath(req) {
  try {
    return new URL(req.originalUrl || req.url || '/', 'http://local').pathname;
  } catch {
    return String(req.path || req.url || '-').split('?')[0] || '-';
  }
}

function getRequestSource(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return {
    ip: forwardedFor || req.ip || req.socket?.remoteAddress || '',
    origin: req.get('origin') || '',
    referer: req.get('referer') || '',
    userAgent: req.get('user-agent') || '',
  };
}

function classifyAccessLog(req, res) {
  const path = getRequestPath(req);
  const status = Number(res.statusCode || 0);

  if (status === 404 && /^\/assets\/.+\.(?:js|mjs|css)$/i.test(path)) {
    return {
      categoryCode: 'FRONTEND_STALE_HTML_MISSING_CHUNK',
      category: '前端缓存不一致',
      message: '旧 SPA 入口 HTML 引用了已不存在的 hashed JS/CSS chunk，请检查 HTML/CDN 缓存和部署是否保留旧 assets。',
    };
  }

  if (status === 404 && /^\/workbox-[a-z0-9]+\.js$/i.test(path)) {
    return {
      categoryCode: 'FRONTEND_STALE_SERVICE_WORKER_ASSET',
      category: '前端缓存不一致',
      message: '旧 Service Worker 引用了已不存在的 workbox 文件，请检查 PWA 缓存策略和部署保留策略。',
    };
  }

  return null;
}

function writeAccessLog(entry) {
  const method = entry.status >= 500 ? 'error' : entry.status >= 400 ? 'warn' : 'info';
  console[method](`[access] ${safeStringifyForLog(entry)}`);
}

module.exports = function accessLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test' && process.env.ACCESS_LOGS_IN_TEST !== '1') return;

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    writeAccessLog(sanitizeLogValue({
      type: 'http_access',
      traceId: req.traceId || '-',
      method: req.method,
      path: getRequestPath(req),
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      source: getRequestSource(req),
      ...(classifyAccessLog(req, res) || {}),
    }));
  });

  next();
};

module.exports._private = {
  getRequestPath,
  getRequestSource,
  classifyAccessLog,
  writeAccessLog,
};
