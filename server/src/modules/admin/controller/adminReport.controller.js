const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminReport.service');

exports.getSales = asyncRoute(async (req, res) => {
  res.success(await svc.getSalesReport(req.query));
});

exports.getUsers = asyncRoute(async (req, res) => {
  res.success(await svc.getUserReport(req.query));
});

exports.getProducts = asyncRoute(async (_req, res) => {
  res.success(await svc.getProductReport());
});

exports.getHomeEngagement = asyncRoute(async (req, res) => {
  res.success(await svc.getHomeEngagementReport(req.query));
});

exports.exportSales = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportSalesReportCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

exports.exportUsers = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportUserReportCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

exports.exportProducts = asyncRoute(async (_req, res) => {
  const { csv, filename } = await svc.exportProductReportCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});
