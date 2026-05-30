const crypto = require('crypto');

function normalizeTraceId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(raw)) return '';
  return raw;
}

module.exports = function requestContext(req, res, next) {
  const incomingTraceId = normalizeTraceId(req.get('x-trace-id') || req.get('x-request-id'));
  const traceId = incomingTraceId || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
};
