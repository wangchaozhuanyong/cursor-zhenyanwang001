const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminUser.service');
const dataChangeTracker = require('../service/adminDataChange.service');

exports.list = asyncRoute(async (req, res) => {
  const r = await svc.listUsers(req.query);
  const totalPages = r.total === 0 ? 0 : Math.ceil(r.total / r.pageSize);
  res.success({ list: r.list, total: r.total, page: r.page, pageSize: r.pageSize, totalPages, summary: r.summary });
});

exports.exportCsv = asyncRoute(async (req, res) => {
  const { csv, filename } = await svc.exportUsersCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.getById = asyncRoute(async (req, res) => {
  const r = await svc.getUserById(req.params.id);
  res.success(r.data);
});

exports.listTags = asyncRoute(async (_req, res) => {
  const r = await svc.listUserTags();
  res.success(r.data);
});

exports.createTag = asyncRoute(async (req, res) => {
  const r = await svc.createUserTag(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.updateTag = asyncRoute(async (req, res) => {
  const r = await svc.updateUserTag(req.params.tagId, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.deleteTag = asyncRoute(async (req, res) => {
  const r = await svc.deleteUserTag(req.params.tagId, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.tagImpact = asyncRoute(async (req, res) => {
  const r = await svc.getUserTagImpact(req.params.tagId);
  res.success(r.data);
});

exports.setTags = asyncRoute(async (req, res) => {
  const r = await svc.setUserTags(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.batchSetTag = asyncRoute(async (req, res) => {
  const r = await svc.batchSetUserTag(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.update = asyncRoute(async (req, res) => {
  const before = await svc.getUserById(req.params.id).then((r) => r.data).catch(() => null);
  const r = await svc.updateUser(req.params.id, req.body, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'user',
    entityType: 'user',
    entityId: req.params.id,
    action: 'profile.update',
    beforeData: before,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.updateAccountStatus = asyncRoute(async (req, res) => {
  const before = await svc.getUserById(req.params.id).then((r) => r.data).catch(() => null);
  const r = await svc.updateUserAccountStatus(req.params.id, req.body, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'user',
    entityType: 'user',
    entityId: req.params.id,
    action: 'account_status.update',
    beforeData: before,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.updateRestrictions = asyncRoute(async (req, res) => {
  const r = await svc.updateUserRestrictions(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.getStatusOverview = asyncRoute(async (req, res) => {
  const r = await svc.getUserStatusOverview(req.params.id);
  res.success(r.data, r.message);
});

exports.updateSubordinate = asyncRoute(async (req, res) => {
  const r = await svc.updateSubordinate(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.adjustPoints = asyncRoute(async (req, res) => {
  const before = await svc.getUserById(req.params.userId).then((r) => r.data).catch(() => null);
  const r = await svc.adjustUserPoints(req.params.userId, req.body, req.user?.id, req);
  await dataChangeTracker.trackFromRequest(req, {
    module: 'loyalty',
    entityType: 'user',
    entityId: req.params.userId,
    action: 'points.adjust',
    beforeData: before,
    afterData: r.data,
  });
  res.success(r.data, r.message);
});

exports.resetPassword = asyncRoute(async (req, res) => {
  const r = await svc.resetUserPassword(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.unbindWechat = asyncRoute(async (req, res) => {
  const r = await svc.adminUnbindWechat(req.params.id, req.user?.id, req);
  res.success(r.data, r.message);
});
