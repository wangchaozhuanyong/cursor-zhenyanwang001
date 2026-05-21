const repo = require('../repository/monitoring.repository');

async function trackChange(payload) {
  return repo.trackChange(payload);
}

function trackFromRequest(req, payload) {
  return trackChange({
    requestId: req.traceId,
    actorType: 'admin',
    actorId: req.user?.id,
    source: 'admin',
    ip: req.ip,
    userAgent: req.get ? req.get('user-agent') : undefined,
    ...payload,
  }).catch((error) => {
    console.warn('[dataChangeTracker] failed:', error?.message || error);
  });
}

module.exports = { trackChange, trackFromRequest };
