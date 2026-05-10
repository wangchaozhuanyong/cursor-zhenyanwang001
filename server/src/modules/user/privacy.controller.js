const { asyncRoute } = require('../../middleware/asyncRoute');
const privacyService = require('./privacy.service');

exports.exportAccountData = asyncRoute(async (req, res) => {
  const result = await privacyService.exportAccountData(req.user.id, req);
  res.success(result.data, result.message);
});

exports.cancelAccount = asyncRoute(async (req, res) => {
  const result = await privacyService.cancelAccount(req.user.id, req.body, req);
  res.success(result.data, result.message);
});
