const orderService = require('../service/order.service');
const orderApiService = require('../services/order.api.service');
const checkoutAbandonmentService = require('../service/checkoutAbandonment.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');
const { writeAuditLog } = require('../../../utils/auditLog');

/** @param {import('express').Request} req */
function orderIdParam(req) {
  const id = req.params.id;
  return Array.isArray(id) ? String(id[0] ?? '') : String(id ?? '');
}

exports.createOrder = asyncRoute(async (req, res) => {
  try {
    const result = await orderApiService.createOrder(req.user.id, req.body);
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType: 'order.create',
      objectType: 'order',
      objectId: result.data?.id || null,
      summary: `用户下单 ${result.data?.order_no || ''}`.trim(),
      after: {
        order_no: result.data?.order_no,
        total_amount: result.data?.total_amount,
        status: result.data?.status,
      },
      result: 'success',
    });
    res.success(result.data, result.message);
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'order.create',
      objectType: 'order',
      summary: '用户下单失败',
      result: 'failure',
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
});

exports.recordCheckoutAbandonment = asyncRoute(async (req, res) => {
  const result = await checkoutAbandonmentService.recordCheckoutSnapshot(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.previewOrder = asyncRoute(async (req, res) => {
  const result = await orderService.previewOrder(req.user.id, req.body);
  res.success(result.data);
});

exports.getOrders = asyncRoute(async (req, res) => {
  const result = await orderApiService.listOrders(req.user.id, req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getOrderSummary = asyncRoute(async (req, res) => {
  const data = await orderService.getOrderSummary(req.user.id);
  res.success(data);
});

exports.getOrderById = asyncRoute(async (req, res) => {
  const result = await orderService.getOrderById(req.user.id, req.params.id);
  res.success(result.data);
});

exports.cancelOrder = asyncRoute(async (req, res) => {
  const orderId = orderIdParam(req);
  try {
    const result = await orderService.cancelOrder(req.user.id, orderId);
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType: 'order.cancel',
      objectType: 'order',
      objectId: orderId,
      summary: `用户取消订单 ${orderId}`,
      result: 'success',
    });
    res.success(result.data, result.message);
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'order.cancel',
      objectType: 'order',
      objectId: orderId,
      summary: '用户取消订单失败',
      result: 'failure',
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
});

exports.payOrder = asyncRoute(async (req, res) => {
  const result = await orderService.payOrder(req.user.id, req.params.id, req.body);
  res.success(result.data, result.message);
});

exports.createStripeCheckoutSession = asyncRoute(async (req, res) => {
  const result = await orderService.createStripeCheckoutSession(req.user.id, req.params.id);
  res.success(result.data);
});

exports.confirmReceive = asyncRoute(async (req, res) => {
  const orderId = orderIdParam(req);
  try {
    const result = await orderService.confirmReceive(req.user.id, orderId);
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType: 'order.confirm_receive',
      objectType: 'order',
      objectId: orderId,
      summary: `用户确认收货 ${orderId}`,
      result: 'success',
    });
    res.success(result.data, result.message);
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'order.confirm_receive',
      objectType: 'order',
      objectId: orderId,
      summary: '用户确认收货失败',
      result: 'failure',
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
});


