const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminFeedback.service');

exports.list = asyncRoute(async (req, res) => {
  const result = await svc.listFeedback(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.update = asyncRoute(async (req, res) => {
  const result = await svc.updateFeedback(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(result.data || null, result.message);
});
