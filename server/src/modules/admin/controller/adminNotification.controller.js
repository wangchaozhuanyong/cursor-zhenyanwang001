const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../adminNotification.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listNotifications(req.query);
  res.paginate(r.list, r.total, r.page, r.pageSize);
});

exports.summary = asyncRoute(async (_req, res) => {
  const r = await svc.getSummary();
  res.success(r.data, r.message);
});

exports.userCandidates = asyncRoute(async (req, res) => {
  const r = await svc.searchUsers(req.query);
  res.success(r.data, r.message);
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

exports.deleteDraft = asyncRoute(async (req, res) => {
  const r = await svc.deleteDraft(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.cancelScheduled = asyncRoute(async (req, res) => {
  const r = await svc.cancelScheduled(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.revokeSent = asyncRoute(async (req, res) => {
  const r = await svc.revokeSent(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});
