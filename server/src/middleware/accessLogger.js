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
    }));
  });

  next();
};

module.exports._private = {
  getRequestPath,
  getRequestSource,
  writeAccessLog,
};
