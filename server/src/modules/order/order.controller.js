const orderService = require('./order.service');
const orderApiService = require('./services/order.api.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

exports.createOrder = asyncRoute(async (req, res) => {
  const result = await orderApiService.createOrder(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.getOrders = asyncRoute(async (req, res) => {
  const result = await orderApiService.listOrders(req.user.id, req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getOrderById = asyncRoute(async (req, res) => {
  const result = await orderService.getOrderById(req.user.id, req.params.id);
  res.success(result.data);
});

exports.cancelOrder = asyncRoute(async (req, res) => {
  const result = await orderService.cancelOrder(req.user.id, req.params.id);
  res.success(result.data, result.message);
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
  const result = await orderService.confirmReceive(req.user.id, req.params.id);
  res.success(result.data, result.message);
});
