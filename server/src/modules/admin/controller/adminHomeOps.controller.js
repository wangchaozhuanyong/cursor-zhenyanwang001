const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminHomeOps.service');

function sendResult(res, result) {
  if (result?.error) return res.fail(result.error.code, result.error.message);
  return res.success(result.data, result.message);
}

exports.listNavItems = asyncRoute(async (_req, res) => {
  res.success(await svc.listNavItems());
});

exports.createNavItem = asyncRoute(async (req, res) => {
  sendResult(res, await svc.createNavItem(req.body));
});

exports.updateNavItem = asyncRoute(async (req, res) => {
  sendResult(res, await svc.updateNavItem(req.params.id, req.body));
});

exports.deleteNavItem = asyncRoute(async (req, res) => {
  sendResult(res, await svc.deleteNavItem(req.params.id));
});

exports.listAnnouncements = asyncRoute(async (_req, res) => {
  res.success(await svc.listAnnouncements());
});

exports.createAnnouncement = asyncRoute(async (req, res) => {
  sendResult(res, await svc.createAnnouncement(req.body));
});

exports.updateAnnouncement = asyncRoute(async (req, res) => {
  sendResult(res, await svc.updateAnnouncement(req.params.id, req.body));
});

exports.deleteAnnouncement = asyncRoute(async (req, res) => {
  sendResult(res, await svc.deleteAnnouncement(req.params.id));
});
