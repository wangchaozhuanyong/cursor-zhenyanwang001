const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminCategory.service');

exports.list = asyncRoute(async (_req, res) => {
  const r = await svc.listCategories();
  res.success(r.data);
});

exports.create = asyncRoute(async (req, res) => {
  const r = await svc.createCategory(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateCategory(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteCategory(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});
