const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminUser.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listUsers(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.exportCsv = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportUsersCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getUserById(req.params.id);
  res.success(r.data);
});

exports.listTags = asyncRoute(async (_req, res) => {
  const r = await svc.listUserTags();
  res.success(r.data);
});

exports.createTag = asyncRoute(async (req, res) => {
  const r = await svc.createUserTag(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.updateTag = asyncRoute(async (req, res) => {
  const r = await svc.updateUserTag(req.params.tagId, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.deleteTag = asyncRoute(async (req, res) => {
  const r = await svc.deleteUserTag(req.params.tagId, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.setTags = asyncRoute(async (req, res) => {
  const r = await svc.setUserTags(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateUser(req.params.id, req.body);
  res.success(r.data, r.message);
});

exports.updateSubordinate = asyncRoute(async (req, res) => {
  const r = await svc.updateSubordinate(req.params.id, req.body);
  res.success(r.data, r.message);
});

exports.adjustPoints = asyncRoute(async (req, res) => {
  const r = await svc.adjustUserPoints(req.params.userId, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.resetPassword = asyncRoute(async (req, res) => {
  const r = await svc.resetUserPassword(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.unbindWechat = asyncRoute(async (req, res) => {
  const r = await svc.adminUnbindWechat(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});
