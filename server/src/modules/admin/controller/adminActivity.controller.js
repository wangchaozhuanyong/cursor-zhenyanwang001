const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminActivity.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listActivities(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getActivity(req.params.id);
  res.success(r.data);
});

exports.create = asyncRoute(async (req, res) => {
  const r = await svc.createActivity(req.body, req.user?.id, req);
  res.success(r.data, r.message || '创建成功');
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateActivity(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message || '更新成功');
});

exports.updateStatus = asyncRoute(async (req, res) => {
  const r = await svc.updateActivityStatus(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message || '状态已更新');
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteActivity(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.validateBeforePublish = asyncRoute(async (req, res) => {
  const r = await svc.validateActivityBeforePublish(req.body, req.params.id || null);
  res.success(r.data);
});

exports.searchProducts = asyncRoute(async (req, res) => {
  const r = await svc.searchActivityProducts(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});
