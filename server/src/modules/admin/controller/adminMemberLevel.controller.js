const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminMemberLevel.service');

exports.list = asyncRoute(async (_req, res) => {
  const list = await svc.listLevels();
  res.success(list);
});

exports.create = asyncRoute(async (req, res) => {
  const r = await svc.createLevel(req, req.body);
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateLevel(req, req.params.id, req.body);
  res.success(r.data, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteLevel(req, req.params.id);
  res.success(r.data, r.message);
});

exports.recalcUserLevel = asyncRoute(async (req, res) => {
  const r = await svc.recalcUserLevel(req, req.params.userId, { force: req.body?.force === true || req.body?.force === 1 });
  res.success(r.data, r.message);
});

exports.recalcAllUserLevels = asyncRoute(async (req, res) => {
  const r = await svc.recalcAllUserLevels(req, { force: req.body?.force === true || req.body?.force === 1 });
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

exports.assignUserLevel = asyncRoute(async (req, res) => {
  const r = await svc.assignUserLevel(req, req.params.userId, req.body?.memberLevelId || req.body?.member_level_id, req.body?.reason);
  res.success(r.data, r.message);
});

exports.unlockUserLevel = asyncRoute(async (req, res) => {
  const r = await svc.unlockUserLevel(req, req.params.userId);
  res.success(r.data, r.message);
});

