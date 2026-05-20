const { asyncRoute } = require('../../../middleware/asyncRoute');
const service = require('../service/home.service');

exports.getBootstrap = asyncRoute(async (_req, res) => {
  const data = await service.getHomeBootstrap();
  res.success(data);
});
