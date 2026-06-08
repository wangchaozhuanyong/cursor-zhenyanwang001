const { asyncRoute } = require('../../../middleware/asyncRoute');
const service = require('../service/home.service');

exports.getBootstrap = asyncRoute(async (_req, res) => {
  const data = await service.getHomeBootstrap();
  res.success(data);
});

exports.getBootstrapLite = asyncRoute(async (_req, res) => {
  const data = await service.getHomeBootstrapLite();
  res.success(data);
});

exports.getMarketing = asyncRoute(async (_req, res) => {
  const data = await service.getHomeMarketing();
  res.success(data);
});
