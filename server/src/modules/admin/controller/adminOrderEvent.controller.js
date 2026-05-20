const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminOrderEvent.service');

exports.recent = asyncRoute(async (req, res) => {
  const result = await svc.listRecentOrderEvents(req.query);
  res.success(result);
});
