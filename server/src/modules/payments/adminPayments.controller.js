const paymentsService = require('./payments.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

exports.listChannels = asyncRoute(async (_req, res) => {
  const list = await paymentsService.listChannelsAdmin();
  res.success(list);
});

exports.updateChannel = asyncRoute(async (req, res) => {
  const result = await paymentsService.updateChannelAdmin(req, req.params.id, req.body);
  res.success(null, result.message);
});

exports.listPaymentOrders = asyncRoute(async (req, res) => {
  const { list, total } = await paymentsService.listPaymentOrdersAdmin(req.query);
  res.paginate(list, total, req.query.page, req.query.pageSize);
});

exports.listPaymentEvents = asyncRoute(async (req, res) => {
  const { list, total } = await paymentsService.listPaymentEventsAdmin(req.query);
  res.paginate(list, total, req.query.page, req.query.pageSize);
});

exports.markOrderPaid = asyncRoute(async (req, res) => {
  const result = await paymentsService.markOrderPaidByAdmin(req, req.params.orderId, req.body);
  res.success(null, result.message);
});

exports.replayEvent = asyncRoute(async (req, res) => {
  const result = await paymentsService.replayEvent(req, req.params.eventId);
  res.success(result.data, result.message);
});

exports.listReconciliations = asyncRoute(async (req, res) => {
  const { list, total } = await paymentsService.listReconciliations(req.query);
  res.paginate(list, total, req.query.page, req.query.pageSize);
});

exports.createReconciliation = asyncRoute(async (req, res) => {
  const result = await paymentsService.createReconciliation(req, req.body);
  res.success(result.data, result.message);
});
