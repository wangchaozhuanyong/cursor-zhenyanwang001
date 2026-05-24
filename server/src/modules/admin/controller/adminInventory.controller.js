const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminInventory.service');
const replenishmentSvc = require('../service/adminReplenishment.service');
const dataChangeTracker = require('../service/adminDataChange.service');

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
  await dataChangeTracker.trackFromRequest(req, {
    module: 'inventory',
    entityType: 'product_variant',
    entityId: req.params.variantId,
    action: 'stock.adjust',
    beforeData: req.body || {},
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.adjustProductStockCompat = asyncRoute(async (req, res) => {
  const r = await svc.adjustProductStockCompat(req.params.productId, req.body || {}, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'inventory',
    entityType: 'product',
    entityId: req.params.productId,
    action: 'stock.adjust',
    beforeData: req.body || {},
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.updateSkuWarningThreshold = asyncRoute(async (req, res) => {
  const r = await svc.updateSkuWarningThreshold(req.params.variantId, req.body || {}, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'inventory',
    entityType: 'product_variant',
    entityId: req.params.variantId,
    action: 'warning_threshold.update',
    beforeData: req.body || {},
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.batchWarningThreshold = asyncRoute(async (req, res) => {
  const r = await svc.batchWarningThreshold(req.body || {});
  res.success(r.data, r.message);
});

exports.batchAdjust = asyncRoute(async (req, res) => {
  const r = await svc.batchAdjust(req.body || {}, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'inventory',
    entityType: 'product_variant',
    entityId: 'batch',
    action: 'stock.batch_adjust',
    beforeData: req.body || {},
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.listRecords = asyncRoute(async (req, res) => {
  const r = await svc.listStockRecords(req.query || {});
  res.success(r);
});

exports.generateReplenishmentAlerts = asyncRoute(async (req, res) => {
  const r = await replenishmentSvc.generateReplenishmentAlerts();
  await dataChangeTracker.trackFromRequest(req, {
    module: 'inventory',
    entityType: 'replenishment_alert',
    entityId: 'batch',
    action: 'replenishment_alert.generate',
    beforeData: {},
    afterData: r,
  });
  res.success(r, '补货预警已扫描');
});

exports.listReplenishmentAlerts = asyncRoute(async (req, res) => {
  const r = await replenishmentSvc.listReplenishmentAlerts(req.query || {});
  res.success(r);
});

exports.createPurchaseOrderFromAlert = asyncRoute(async (req, res) => {
  const r = await replenishmentSvc.createPurchaseOrderFromAlert(req.params.id, req.body || {}, req.user?.id);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'inventory',
    entityType: 'purchase_order',
    entityId: r.id,
    action: 'purchase_order.create_from_alert',
    beforeData: { alertId: req.params.id },
    afterData: r,
  });
  res.success(r, '采购单已创建');
});

exports.listPurchaseOrders = asyncRoute(async (req, res) => {
  const r = await replenishmentSvc.listPurchaseOrders(req.query || {});
  res.success(r);
});

exports.getPurchaseOrder = asyncRoute(async (req, res) => {
  const r = await replenishmentSvc.getPurchaseOrder(req.params.id);
  res.success(r);
});

exports.receivePurchaseOrder = asyncRoute(async (req, res) => {
  const r = await replenishmentSvc.receivePurchaseOrder(req.params.id, req.body || {}, req.user?.id);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'inventory',
    entityType: 'purchase_order',
    entityId: req.params.id,
    action: 'purchase_order.receive',
    beforeData: req.body || {},
    afterData: r,
  });
  res.success(r, '采购到货已入库');
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

exports.listPackRules = asyncRoute(async (req, res) => {
  const r = await svc.listPackRules(req.query || {});
  res.success(r);
});

exports.createPackRule = asyncRoute(async (req, res) => {
  const r = await svc.createPackRule(req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.updatePackRule = asyncRoute(async (req, res) => {
  const r = await svc.updatePackRule(req.params.id, req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.deletePackRule = asyncRoute(async (req, res) => {
  const r = await svc.deletePackRule(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.unpack = asyncRoute(async (req, res) => {
  const r = await svc.unpack(req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.assemble = asyncRoute(async (req, res) => {
  const r = await svc.assemble(req.body || {}, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.listConversions = asyncRoute(async (req, res) => {
  const r = await svc.listConversions(req.query || {});
  res.success(r);
});

exports.getConversion = asyncRoute(async (req, res) => {
  const r = await svc.getConversion(req.params.id);
  res.success(r.data);
});

