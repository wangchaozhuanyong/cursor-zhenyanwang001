const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminExtended.service');

exports.list = asyncRoute(async (_req, res) => {
  res.success(await svc.listBanners());
});

exports.create = asyncRoute(async (req, res) => {
  const r = await svc.createBanner(req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const r = await svc.updateBanner(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteBanner(req.params.id, req.user?.id, req);
  res.success(null, r.message);
});
