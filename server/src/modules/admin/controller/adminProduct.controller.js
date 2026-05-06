/**
 * Admin Product Controller（含 product-tags 子资源）
 */
const { asyncRoute } = require('../../../middleware/asyncRoute');
const { ValidationError } = require('../../../errors');
const svc = require('../adminProduct.service');
const adminExtended = require('../adminExtended.service');

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

exports.importCsv = asyncRoute(async (req, res) => {
  if (!req.file || !req.file.buffer) throw new ValidationError('请上传 CSV 文件');
  const text = req.file.buffer.toString('utf8');
  const r = await svc.importProductsCsv(text, req.user?.id);
  res.success(r.data, r.message);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getProductById(req.params.id);
  res.success(r.data);
});

exports.create = asyncRoute(async (req, res) => {
  const r = await svc.createProduct(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateProduct(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteProduct(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.batchUpdateStatus = asyncRoute(async (req, res) => {
  const { ids, status } = req.body;
  const r = await svc.batchUpdateStatus(ids, status, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

/* ── tags ── */

exports.listTags = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listProductTags());
});

exports.createTag = asyncRoute(async (req, res) => {
  const r = await adminExtended.createProductTag(req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

exports.removeTag = asyncRoute(async (req, res) => {
  const r = await adminExtended.deleteProductTag(req.params.id, req.user?.id, req);
  res.success(null, r.message);
});
