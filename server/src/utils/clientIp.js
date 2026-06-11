const { normalizeIpForLookup } = require('./ipLocation');

function getHeader(req, name) {
  if (!req) return '';
  if (typeof req.get === 'function') return req.get(name) || '';
  const headers = req.headers && typeof req.headers === 'object' ? req.headers : {};
  return headers[String(name).toLowerCase()] || headers[name] || '';
}

function firstHeaderIp(value) {
  return String(value || '')
    .split(',')
    .map((item) => normalizeIpForLookup(item))
    .find(Boolean) || '';
}

function getClientIp(req) {
  const candidates = [
    getHeader(req, 'cf-connecting-ip'),
    getHeader(req, 'true-client-ip'),
    getHeader(req, 'x-real-ip'),
    firstHeaderIp(getHeader(req, 'x-forwarded-for')),
    req?.ip,
    req?.socket?.remoteAddress,
  ];

  return candidates
    .map((item) => normalizeIpForLookup(item))
    .find(Boolean) || '';
}

module.exports = {
  firstHeaderIp,
  getClientIp,
  getHeader,
};
