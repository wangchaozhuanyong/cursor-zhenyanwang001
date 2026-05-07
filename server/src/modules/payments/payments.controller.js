const paymentsService = require('./payments.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

exports.listChannels = asyncRoute(async (req, res) => {
  const result = await paymentsService.listChannelsForUser(req.query.country, req.query.currency);
  res.success(result);
});

exports.createIntent = asyncRoute(async (req, res) => {
  const result = await paymentsService.createIntent(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.getIntent = asyncRoute(async (req, res) => {
  const result = await paymentsService.getIntent(req.user.id, req.params.id);
  res.success(result.data);
});
