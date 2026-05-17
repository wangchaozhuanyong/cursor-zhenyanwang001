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

exports.resolveUsers = asyncRoute(async (req, res) => {
  const r = await svc.resolveUsers(req.body);
  res.success(r.data, r.message);
});

exports.estimateAudience = asyncRoute(async (req, res) => {
  const r = await svc.estimateAudience(req.body);
  res.success(r.data, r.message);
});

exports.detail = asyncRoute(async (req, res) => {
  const r = await svc.getNotificationDetail(req.params.id, req.query);
  res.success(r.data, r.message);
});

exports.exportRecipientsCsv = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportBatchRecipientsCsv(req.params.id, req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
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

exports.previewTriggerRule = asyncRoute(async (req, res) => {
  const r = await svc.previewTriggerRule(req.body);
  res.success(r.data, r.message);
});

exports.testSendTriggerRule = asyncRoute(async (req, res) => {
  const r = await svc.testSendTriggerRule(req.body, req.user?.id, req);
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
