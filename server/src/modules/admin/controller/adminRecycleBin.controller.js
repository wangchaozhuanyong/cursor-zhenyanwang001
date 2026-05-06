const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminRecycleBin.service');

exports.list = asyncRoute(async (req, res) => {
  res.success(await svc.listRecycleBin(req.query));
});

exports.restore = asyncRoute(async (req, res) => {
  const { type } = req.body;
  const r = await svc.restoreItem(type, req.params.id, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.permanentDelete = asyncRoute(async (req, res) => {
  const { type } = req.body;
  const r = await svc.permanentDelete(type, req.params.id, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});
