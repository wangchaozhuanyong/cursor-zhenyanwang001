const { asyncRoute } = require('../../../middleware/asyncRoute');
const service = require('../service/privacy.service');

exports.recordConsent = asyncRoute(async (req, res) => {
  const result = await service.recordConsent(req.user?.id || null, req.body, req);
  res.success(result.data, 'Cookie consent recorded');
});

exports.getMyConsent = asyncRoute(async (req, res) => {
  const result = await service.getMyConsent(req.user?.id || null, req.query);
  res.success(result.data);
});
