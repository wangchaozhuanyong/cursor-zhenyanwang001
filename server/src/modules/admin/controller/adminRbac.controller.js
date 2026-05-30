const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/rbac.service');

exports.listPermissions = asyncRoute(async (_req, res) => {
  const r = await svc.listPermissions();
  res.success(r.data);
});

exports.listRoles = asyncRoute(async (_req, res) => {
  const r = await svc.listRoles();
  res.success(r.data);
});

exports.listAdminUsers = asyncRoute(async (_req, res) => {
  const r = await svc.listAdminUsers();
  res.success(r.data);
});

exports.getAdminMfaPolicy = asyncRoute(async (_req, res) => {
  const r = await svc.getAdminMfaPolicy();
  res.success(r.data);
});

exports.updateAdminMfaPolicy = asyncRoute(async (req, res) => {
  const r = await svc.updateAdminMfaPolicy(req.body || {}, req.user, req);
  res.success(r.data, r.message);
});

exports.getUserRoles = asyncRoute(async (req, res) => {
  const r = await svc.getUserRoles(req.params.userId);
  res.success(r.data);
});

exports.setUserRoles = asyncRoute(async (req, res) => {
  const r = await svc.setUserRoles(req.user, req.params.userId, req.body?.roleIds, req);
  res.success(r.data, r.message);
});

exports.createRole = asyncRoute(async (req, res) => {
  const r = await svc.createRole(req.body, req.user, req);
  res.success(r.data, r.message);
});

exports.updateRole = asyncRoute(async (req, res) => {
  const r = await svc.updateRole(req.params.roleId, req.body, req.user, req);
  res.success(r.data, r.message);
});

exports.removeRole = asyncRoute(async (req, res) => {
  const r = await svc.deleteRole(req.params.roleId, req.user, req);
  res.success(r.data, r.message);
});

exports.createAdminUser = asyncRoute(async (req, res) => {
  const r = await svc.createAdminUser(req.body, req.user, req);
  res.success(r.data, r.message);
});

exports.toggleAdminUser = asyncRoute(async (req, res) => {
  const r = await svc.toggleAdminUser(req.params.userId, req.body.enabled, req.user, req);
  res.success(r.data, r.message);
});

exports.resetAdminPassword = asyncRoute(async (req, res) => {
  const r = await svc.resetAdminPassword(req.params.userId, req.body, req.user, req);
  res.success(r.data, r.message);
});

exports.removeAdminUser = asyncRoute(async (req, res) => {
  const r = await svc.deleteAdminUser(req.params.userId, req.user, req);
  res.success(r.data, r.message);
});

exports.getAdminUserSecurity = asyncRoute(async (req, res) => {
  const r = await svc.getAdminUserSecurity(req.params.userId, req.user);
  res.success(r.data);
});

exports.setAdminUserMfaRequired = asyncRoute(async (req, res) => {
  const r = await svc.setAdminUserMfaRequired(req.params.userId, Boolean(req.body?.required), req.user, req);
  res.success(r.data, r.message);
});

exports.resetAdminUserMfa = asyncRoute(async (req, res) => {
  const r = await svc.resetAdminUserMfa(req.params.userId, req.user, req);
  res.success(r.data, r.message);
});

exports.revokeAdminTrustedDevices = asyncRoute(async (req, res) => {
  const r = await svc.revokeAdminTrustedDevices(req.params.userId, req.user, req);
  res.success(r.data, r.message);
});

exports.revokeAdminTrustedDevice = asyncRoute(async (req, res) => {
  const r = await svc.revokeAdminTrustedDevice(req.params.userId, req.params.deviceId, req.user, req);
  res.success(r.data, r.message);
});
