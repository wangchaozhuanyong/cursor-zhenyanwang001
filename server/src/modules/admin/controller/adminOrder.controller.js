const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminOrder.service');
const dataChangeTracker = require('../service/adminDataChange.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listOrders(req.query);
  const totalPages = r.total === 0 ? 0 : Math.ceil(r.total / r.pageSize);
  res.success({
    list: r.list,
    total: r.total,
    page: r.page,
    pageSize: r.pageSize,
    totalPages,
    summary: r.summary || {},
  });
});

exports.exportCsv = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportOrdersCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getOrderById(req.params.id);
  res.success(r.data);
});

exports.updateStatus = asyncRoute(async (req, res) => {
  const before = await svc.getOrderById(req.params.id).then((r) => r.data).catch(() => null);
  const r = await svc.updateOrderStatus(req.params.id, req.body, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'order',
    entityType: 'order',
    entityId: req.params.id,
    action: 'status.update',
    beforeData: before,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.ship = asyncRoute(async (req, res) => {
  const before = await svc.getOrderById(req.params.id).then((r) => r.data).catch(() => null);
  const r = await svc.shipOrder(req.params.id, req.body, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'order',
    entityType: 'order',
    entityId: req.params.id,
    action: 'ship',
    beforeData: before,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.listPendingShipments = asyncRoute(async (req, res) => {
  const r = await svc.listPendingShipmentOrders(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.batchShip = asyncRoute(async (req, res) => {
  const r = await svc.batchShipOrders(req.body, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'order',
    entityType: 'order',
    entityId: 'batch',
    action: 'batch_ship',
    beforeData: req.body,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});
