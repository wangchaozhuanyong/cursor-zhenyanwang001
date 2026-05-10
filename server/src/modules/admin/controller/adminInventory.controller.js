const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminInventory.service');

exports.listProducts = asyncRoute(async (req, res) => {
  const r = await svc.listInventoryProducts(req.query || {});
  res.success(r);
});

exports.adjustStock = asyncRoute(async (req, res) => {
  const r = await svc.adjustStock(req.params.productId, req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.updateWarningThreshold = asyncRoute(async (req, res) => {
  const r = await svc.updateWarningThreshold(req.params.productId, req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.listRecords = asyncRoute(async (req, res) => {
  const r = await svc.listStockRecords(req.query || {});
  res.success(r);
});
