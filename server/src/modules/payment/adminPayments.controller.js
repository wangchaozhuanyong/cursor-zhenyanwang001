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
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
  res.paginate(list, total, page, pageSize);
});

exports.listPaymentEvents = asyncRoute(async (req, res) => {
  const { list, total } = await paymentsService.listPaymentEventsAdmin(req.query);
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
  res.paginate(list, total, page, pageSize);
});

exports.markOrderPaid = asyncRoute(async (req, res) => {
  const result = await paymentsService.markOrderPaidByAdmin(req, req.params.orderId, req.body);
  res.success(null, result.message);
});

exports.recordRefund = asyncRoute(async (req, res) => {
  const result = await paymentsService.recordRefundByAdmin(req, req.params.orderId, req.body);
  res.success(result.data, result.message);
});

exports.replayEvent = asyncRoute(async (req, res) => {
  const result = await paymentsService.replayEvent(req, req.params.eventId);
  res.success(result.data, result.message);
});

exports.listReconciliations = asyncRoute(async (req, res) => {
  const { list, total } = await paymentsService.listReconciliations(req.query);
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
  res.paginate(list, total, page, pageSize);
});

exports.createReconciliation = asyncRoute(async (req, res) => {
  const result = await paymentsService.createReconciliation(req, req.body);
  res.success(result.data, result.message);
});

