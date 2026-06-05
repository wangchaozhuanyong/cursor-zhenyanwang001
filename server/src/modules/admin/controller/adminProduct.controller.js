/**
 * Admin product controller, including product tag sub-resources.
 */
const { asyncRoute } = require('../../../middleware/asyncRoute');
const { ValidationError } = require('../../../errors');
const svc = require('../service/adminProduct.service');
const adminExtended = require('../service/adminExtended.service');
const dataChangeTracker = require('../service/adminDataChange.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listProducts(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.exportCsv = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportProductsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.previewImport = asyncRoute(async (req, res) => {
  if (!req.file || !req.file.buffer) throw new ValidationError('请上传导入文件');
  const r = await svc.previewProductsImportFile(req.file, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.importCsv = asyncRoute(async (req, res) => {
  if (!req.file || !req.file.buffer) throw new ValidationError('请上传 CSV 文件');
  const r = await svc.importProductsFile(req.file, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getProductById(req.params.id);
  res.success(r.data);
});

exports.create = asyncRoute(async (req, res) => {
  const r = await svc.createProduct(req.body, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'product',
    entityType: 'product',
    entityId: r.data?.id || req.body?.id,
    action: 'create',
    beforeData: null,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const before = await svc.getProductById(req.params.id).then((r) => r.data).catch(() => null);
  const r = await svc.updateProduct(req.params.id, req.body, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'product',
    entityType: 'product',
    entityId: req.params.id,
    action: 'update',
    beforeData: before,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.patchStatus = asyncRoute(async (req, res) => {
  const before = await svc.getProductById(req.params.id).then((r) => r.data).catch(() => null);
  const r = await svc.patchProductLifecycle(req.params.id, req.body.lifecycle_status, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'product',
    entityType: 'product',
    entityId: req.params.id,
    action: 'status.update',
    beforeData: before,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const before = await svc.getProductById(req.params.id).then((r) => r.data).catch(() => null);
  const r = await svc.deleteProduct(req.params.id, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'product',
    entityType: 'product',
    entityId: req.params.id,
    action: 'delete',
    beforeData: before,
    afterData: r.data || null,
  });
  res.success(r.data, r.message);
});

exports.batchUpdateStatus = asyncRoute(async (req, res) => {
  const { ids, status } = req.body;
  const r = await svc.batchUpdateStatus(ids, status, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

/* tags */

exports.listTags = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listProductTags());
});

exports.createTag = asyncRoute(async (req, res) => {
  const r = await adminExtended.createProductTag(req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

exports.updateTag = asyncRoute(async (req, res) => {
  const r = await adminExtended.updateProductTag(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

exports.removeTag = asyncRoute(async (req, res) => {
  const r = await adminExtended.deleteProductTag(req.params.id, req.user?.id, req);
  res.success(null, r.message);
});

exports.updateProductTags = asyncRoute(async (req, res) => {
  const before = await svc.getProductById(req.params.id).then((r) => r.data).catch(() => null);
  const r = await svc.updateProductTags(req.params.id, req.body.tag_ids, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'product',
    entityType: 'product',
    entityId: req.params.id,
    action: 'tags.update',
    beforeData: before,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});
