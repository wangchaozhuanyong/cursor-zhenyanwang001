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

exports.draft = asyncRoute(async (req, res) => {
  const r = await svc.createDraft(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.publish = asyncRoute(async (req, res) => {
  const r = await svc.publishDraft(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.templates = asyncRoute(async (_req, res) => {
  const r = svc.listTemplates();
  res.success(r.data, r.message);
});

exports.triggerSettings = asyncRoute(async (_req, res) => {
  const r = await svc.listTriggerSettings();
  res.success(r.data, r.message);
});

exports.updateTriggerSettings = asyncRoute(async (req, res) => {
  const r = await svc.updateTriggerSettings(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.remove = asyncRoute(async (req, res) => {
  const r = await svc.deleteNotification(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});
