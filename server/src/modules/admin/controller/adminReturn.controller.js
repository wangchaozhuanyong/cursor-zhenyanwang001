const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminExtended.service');

exports.list = asyncRoute(async (req, res) => {
  const { list, total, page, pageSize } = await svc.listReturns(req.query);
  res.paginate(list, total, page, pageSize);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getReturnById(req.params.id);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data);
});

exports.updateStatus = asyncRoute(async (req, res) => {
  const r = await svc.updateReturnStatus(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.approve = asyncRoute(async (req, res) => {
  const r = await svc.approveReturn(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.reject = asyncRoute(async (req, res) => {
  const r = await svc.rejectReturn(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});
