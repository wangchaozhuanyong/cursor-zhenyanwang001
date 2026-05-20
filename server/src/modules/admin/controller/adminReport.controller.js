const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminReport.service');

exports.getOverview = asyncRoute(async (req, res) => {
  res.success(await svc.getOverview(req.query));
});
exports.getSalesDaily = asyncRoute(async (req, res) => {
  res.success(await svc.getSalesDaily(req.query));
});
exports.getSalesMonthly = asyncRoute(async (req, res) => {
  res.success(await svc.getSalesMonthly(req.query));
});
exports.getProfitDaily = asyncRoute(async (req, res) => {
  res.success(await svc.getProfitDaily(req.query));
});
exports.getProductsAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getProductsAnalysis(req.query));
});
exports.getCategoriesAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getCategoriesAnalysis(req.query));
});
exports.getOrdersAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getOrdersAnalysis(req.query));
});
exports.getCustomersAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getCustomersAnalysis(req.query));
});
exports.getActivitiesAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getActivitiesAnalysis(req.query));
});
exports.getCouponsAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getCouponsAnalysis(req.query));
});
exports.getInventoryAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getInventoryAnalysis(req.query));
});
exports.getSearchAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getSearchAnalysis(req.query));
});
exports.getTrafficAnalysis = asyncRoute(async (req, res) => {
  res.success(await svc.getTrafficAnalysis(req.query));
});

exports.listOperatingExpenses = asyncRoute(async (req, res) => {
  res.success(await svc.listOperatingExpenses(req.query));
});
exports.createOperatingExpense = asyncRoute(async (req, res) => {
  res.success(await svc.createOperatingExpense(req.body, req.user || {}));
});
exports.updateOperatingExpense = asyncRoute(async (req, res) => {
  res.success(await svc.updateOperatingExpense(req.params.id, req.body, req.user || {}));
});
exports.deleteOperatingExpense = asyncRoute(async (req, res) => {
  res.success(await svc.deleteOperatingExpense(req.params.id, req.user || {}));
});

exports.exportByType = asyncRoute(async (req, res) => {
  const type = String(req.query.type || 'sales_daily');
  const { csv, filename } = await svc.exportByType(type, req.query || {});
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

exports.exportProfit = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportByType('profit_daily', req.query || {});
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

exports.getSales = exports.getSalesDaily;
exports.getUsers = exports.getCustomersAnalysis;
exports.getProducts = exports.getProductsAnalysis;
exports.getHomeEngagement = exports.getOverview;
exports.exportSales = exports.exportByType;
exports.exportUsers = exports.exportByType;
exports.exportProducts = exports.exportByType;

