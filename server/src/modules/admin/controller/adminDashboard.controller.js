const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminDashboard.service');

exports.getStats = asyncRoute(async (req, res) => {
  res.success(await svc.getStats(req.query, req.user));
});
