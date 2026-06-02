const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/analytics.service');

exports.track = asyncRoute(async (req, res) => {
  const r = await svc.trackEvent(req.body || {}, req);
  res.success(r.data, r.message);
});

exports.trackBatch = asyncRoute(async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : req.body?.events;
  const r = await svc.trackEvents(events, req);
  res.success(r.data, r.message);
});
