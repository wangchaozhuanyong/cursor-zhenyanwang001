const { asyncRoute } = require('../../../middleware/asyncRoute');

function getPaymentApi() {
  return /** @type {any} */ (require('../../payment')).api || {};
}

function requirePaymentApi(name) {
  const fn = getPaymentApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Payment 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

exports.listChannels = asyncRoute(async (_req, res) => {
  const list = await requirePaymentApi('listChannelsAdmin')();
  res.success(list);
});

exports.updateChannel = asyncRoute(async (req, res) => {
  const result = await requirePaymentApi('updateChannelAdmin')(req, req.params.id, req.body);
  res.success(null, result.message);
});

exports.listPaymentOrders = asyncRoute(async (req, res) => {
  const { list, total } = await requirePaymentApi('listPaymentOrdersAdmin')(req.query);
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
  res.paginate(list, total, page, pageSize);
});

exports.listPaymentEvents = asyncRoute(async (req, res) => {
  const { list, total } = await requirePaymentApi('listPaymentEventsAdmin')(req.query);
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
  res.paginate(list, total, page, pageSize);
});

exports.markOrderPaid = asyncRoute(async (req, res) => {
  const result = await requirePaymentApi('markOrderPaidByAdmin')(req, req.params.orderId, req.body);
  res.success(null, result.message);
});

exports.recordRefund = asyncRoute(async (req, res) => {
  const result = await requirePaymentApi('recordRefundByAdmin')(req, req.params.orderId, req.body);
  res.success(result.data, result.message);
});

exports.replayEvent = asyncRoute(async (req, res) => {
  const result = await requirePaymentApi('replayEvent')(req, req.params.eventId);
  res.success(result.data, result.message);
});

exports.listReconciliations = asyncRoute(async (req, res) => {
  const { list, total } = await requirePaymentApi('listReconciliations')(req.query);
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
  res.paginate(list, total, page, pageSize);
});

exports.createReconciliation = asyncRoute(async (req, res) => {
  const result = await requirePaymentApi('createReconciliation')(req, req.body);
  res.success(result.data, result.message);
});
