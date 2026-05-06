const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminInvite.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listInvites(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});
