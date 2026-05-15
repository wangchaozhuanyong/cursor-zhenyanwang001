const { asyncRoute } = require('../../middleware/asyncRoute');
const svc = require('./search.service');

exports.track = asyncRoute(async (req, res) => {
  const r = await svc.trackSearch(req.body || {}, req);
  res.success(r.data, r.message);
});

exports.hot = asyncRoute(async (req, res) => {
  res.success(await svc.listHotTerms(req.query || {}));
});

exports.suggest = asyncRoute(async (req, res) => {
  res.success(await svc.listSuggestions(req.query || {}));
});
