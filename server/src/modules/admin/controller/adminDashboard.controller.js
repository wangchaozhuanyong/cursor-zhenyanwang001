const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminDashboard.service');

exports.getStats = asyncRoute(async (_req, res) => {
  res.success(await svc.getStats());
});

exports.getChart = asyncRoute(async (_req, res) => {
  res.success(await svc.getChart());
});

