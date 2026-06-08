const crypto = require('crypto');
const { getRequestPerf } = require('../utils/requestPerf');

const PAYLOAD_AUDIT_PATHS = [
  /^\/api\/home\/bootstrap$/,
  /^\/api\/home\/bootstrap-lite$/,
  /^\/api\/home\/marketing$/,
  /^\/api\/products$/,
  /^\/api\/products\/home$/,
  /^\/api\/products\/[^/]+$/,
  /^\/api\/products\/[^/]+\/related$/,
  /^\/api\/banners(?:\/)?$/,
  /^\/api\/categories(?:\/)?$/,
];

function getPath(req) {
  try {
    return new URL(req.originalUrl || req.url || '/', 'http://local').pathname;
  } catch {
    return String(req.path || req.url || '').split('?')[0];
  }
}

function shouldAuditPayload(req) {
  if (req.method !== 'GET') return false;
  const path = getPath(req);
  return PAYLOAD_AUDIT_PATHS.some((re) => re.test(path));
}

function payloadLevel(bytes) {
  if (bytes >= 1024 * 1024) return 'critical';
  if (bytes >= 500 * 1024) return 'error';
  if (bytes >= 200 * 1024) return 'warning';
  return 'ok';
}

function setServerTiming(req, res, responseBytes) {
  const perf = getRequestPerf();
  if (!perf) return;
  const appDurationMs = Number(process.hrtime.bigint() - perf.startedAt) / 1e6;
  const parts = [
    `app;dur=${appDurationMs.toFixed(1)}`,
    `db;dur=${Number(perf.dbDurationMs || 0).toFixed(1)}`,
  ];
  if (perf.cacheHit !== undefined) {
    parts.push(`cache;desc="${perf.cacheHit ? 'hit' : 'miss'}"`);
  }
  if (Number.isFinite(responseBytes)) {
    parts.push(`payload;dur=${Math.max(0, Math.round(responseBytes / 1024))}`);
  }
  res.setHeader('Server-Timing', parts.join(', '));
}

function logPayloadAudit(req, res, responseBytes) {
  if (!shouldAuditPayload(req)) return;
  const level = payloadLevel(responseBytes);
  const perf = getRequestPerf();
  const entry = {
    type: 'api_payload',
    method: req.method,
    path: getPath(req),
    status: res.statusCode,
    duration: perf ? Number((Number(process.hrtime.bigint() - perf.startedAt) / 1e6).toFixed(1)) : undefined,
    responseBytes,
    level,
    userId: req.user?.id || req.userId || undefined,
    cacheHit: perf?.cacheHit,
    dbDuration: perf ? Number(Number(perf.dbDurationMs || 0).toFixed(1)) : undefined,
    dbQueries: perf?.dbQueries,
  };
  const method = level === 'critical' || level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info';
  console[method](`[api.payload] ${JSON.stringify(entry)}`);
}

module.exports = function responseMiddleware(req, res, next) {
  const traceId = req.traceId || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    let responseBytes = 0;
    try {
      responseBytes = Buffer.byteLength(JSON.stringify(body), 'utf8');
    } catch {
      responseBytes = 0;
    }
    setServerTiming(req, res, responseBytes);
    logPayloadAudit(req, res, responseBytes);
    return originalJson(body);
  };

  res.success = (data = null, message = '成功') => {
    res.json({ code: 0, message, data, traceId });
  };

  res.fail = (code, message, data = null) => {
    const httpStatus = code >= 100 && code < 600 ? code : 400;
    res.status(httpStatus).json({ code, message, data, traceId });
  };

  res.paginate = (list, total, page, pageSize) => {
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    res.json({
      code: 0,
      message: '成功',
      data: { list, total, page, pageSize, totalPages },
      traceId,
    });
  };

  next();
};
