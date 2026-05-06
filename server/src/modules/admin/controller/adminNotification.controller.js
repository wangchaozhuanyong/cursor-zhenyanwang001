const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminNotification.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listNotifications(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.send = asyncRoute(async (req, res) => {
  const r = await svc.sendNotification(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteNotification(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});
