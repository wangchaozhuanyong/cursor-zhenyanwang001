const { asyncRoute } = require('../../../middleware/asyncRoute');
const logisticsService = require('../service/logistics.service');

exports.refreshOrderTracking = asyncRoute(async (req, res) => {
  const result = await logisticsService.refreshOrderTracking(req.params.id);
  res.success(result.data, result.message);
});
