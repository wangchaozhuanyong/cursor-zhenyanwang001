function getPath(req) {
  try {
    return new URL(req.originalUrl || req.url || '/', 'http://local').pathname;
  } catch {
    return String(req.path || req.url || '-').split('?')[0] || '-';
  }
}

function getQueryKeys(req) {
  const query = req.query || {};
  if (!query || typeof query !== 'object') return [];
  return Object.keys(query).sort().slice(0, 20);
}

function getThreshold(name, fallback) {
  const raw = Number(process.env[name] || 0);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

module.exports = function serverTiming() {
  const warnMs = getThreshold('API_SLOW_WARN_MS', 300);
  const errorMs = getThreshold('API_SLOW_ERROR_MS', 800);

  return function serverTimingMiddleware(req, res, next) {
    const startedAt = process.hrtime.bigint();
    const originalWriteHead = res.writeHead;

    res.writeHead = function writeHeadWithServerTiming(...args) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      if (!res.headersSent && !res.getHeader('Server-Timing')) {
        res.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(1)}`);
      }
      return originalWriteHead.apply(this, args);
    };

    res.on('finish', () => {
      if (process.env.NODE_ENV === 'test' && process.env.API_TIMING_LOGS_IN_TEST !== '1') return;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      if (durationMs < warnMs) return;

      const level = durationMs >= errorMs ? 'error' : 'warn';
      console[level]('[api.slow]', JSON.stringify({
        traceId: req.traceId || '-',
        method: req.method,
        path: getPath(req),
        status: res.statusCode,
        user_id: req.user?.id || req.admin?.id || null,
        query_keys: getQueryKeys(req),
        duration_ms: Number(durationMs.toFixed(2)),
        warn_ms: warnMs,
        error_ms: errorMs,
      }));
    });

    next();
  };
};

module.exports._private = {
  getPath,
  getQueryKeys,
  getThreshold,
};
