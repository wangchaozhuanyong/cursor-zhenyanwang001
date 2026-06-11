const repo = require('../repository/monitoring.repository');
const { getClientIp } = require('../../../utils/clientIp');

async function trackChange(payload) {
  return repo.trackChange(payload);
}

function trackFromRequest(req, payload) {
  return trackChange({
    requestId: req.traceId,
    actorType: 'admin',
    actorId: req.user?.id,
    source: 'admin',
    ip: getClientIp(req),
    userAgent: req.get ? req.get('user-agent') : undefined,
    ...payload,
  }).catch((error) => {
    console.warn('[dataChangeTracker] failed:', error?.message || error);
  });
}

module.exports = { trackChange, trackFromRequest };
