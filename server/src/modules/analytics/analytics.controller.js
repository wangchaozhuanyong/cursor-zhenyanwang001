const { asyncRoute } = require('../../middleware/asyncRoute');
const svc = require('./analytics.service');

exports.track = asyncRoute(async (req, res) => {
  const r = await svc.trackEvent(req.body || {}, req);
  res.success(r.data, r.message);
});

