const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminInvite.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listInvites(req.query);
  const totalPages = r.total === 0 ? 0 : Math.ceil(r.total / r.pageSize);
  res.success({ list: r.list, total: r.total, page: r.page, pageSize: r.pageSize, totalPages, summary: r.summary });
});
