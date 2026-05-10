const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminMemberLevel.service');

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
