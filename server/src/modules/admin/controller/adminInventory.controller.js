const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminInventory.service');

exports.summary = asyncRoute(async (req, res) => {
  const r = await svc.getSummary();
  res.success(r.data);
});

exports.listSkus = asyncRoute(async (req, res) => {
  const r = await svc.listSkus(req.query || {});
  res.success(r);
});

exports.adjustSkuStock = asyncRoute(async (req, res) => {
  const r = await svc.adjustSkuStock(req.params.variantId, req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.adjustProductStockCompat = asyncRoute(async (req, res) => {
  const r = await svc.adjustProductStockCompat(req.params.productId, req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.updateSkuWarningThreshold = asyncRoute(async (req, res) => {
  const r = await svc.updateSkuWarningThreshold(req.params.variantId, req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.batchWarningThreshold = asyncRoute(async (req, res) => {
  const r = await svc.batchWarningThreshold(req.body || {});
  res.success(r.data, r.message);
});

exports.batchAdjust = asyncRoute(async (req, res) => {
  const r = await svc.batchAdjust(req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.listRecords = asyncRoute(async (req, res) => {
  const r = await svc.listStockRecords(req.query || {});
  res.success(r);
});

exports.exportSkusCsv = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportSkusCsv(req.query || {});
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.exportRecordsCsv = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportRecordsCsv(req.query || {});
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

