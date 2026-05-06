const { asyncRoute } = require('../../../middleware/asyncRoute');
const { ValidationError } = require('../../../errors');
const svc = require('../adminReview.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listReviews(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.toggleVisibility = asyncRoute(async (req, res) => {
  const r = await svc.toggleVisibility(req.params.id, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.toggleFeatured = asyncRoute(async (req, res) => {
  const r = await svc.toggleFeatured(req.params.id, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data || null, r.message);
});

exports.reply = asyncRoute(async (req, res) => {
  const r = await svc.replyReview(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteReview(req.params.id, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.restore = asyncRoute(async (req, res) => {
  const r = await svc.restoreReview(req.params.id, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.permanentDelete = asyncRoute(async (req, res) => {
  const r = await svc.permanentDelete(req.params.id, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.batchHide = asyncRoute(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new ValidationError('请选择评论');
  const r = await svc.batchHide(ids, req.user?.id, req);
  res.success(null, r.message);
});

exports.batchDelete = asyncRoute(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new ValidationError('请选择评论');
  const r = await svc.batchDelete(ids, req.user?.id, req);
  res.success(null, r.message);
});
