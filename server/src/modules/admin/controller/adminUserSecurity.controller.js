const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminUserSecurity.service');

function sendList(res, r) {
  res.success({
    list: r.list,
    total: r.total,
    page: r.page,
    pageSize: r.pageSize,
    totalPages: r.totalPages,
  });
}

exports.overview = asyncRoute(async (_req, res) => {
  const r = await svc.overview();
  res.success(r.data);
});

exports.loginAttempts = asyncRoute(async (req, res) => {
  const r = await svc.listLoginAttempts(req.query);
  sendList(res, r);
});

exports.events = asyncRoute(async (req, res) => {
  const r = await svc.listSecurityEvents(req.query);
  sendList(res, r);
});

exports.riskIps = asyncRoute(async (req, res) => {
  const r = await svc.listRiskIps(req.query);
  sendList(res, r);
});

exports.blockIp = asyncRoute(async (req, res) => {
  const r = await svc.blockIp(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.unblockIp = asyncRoute(async (req, res) => {
  const r = await svc.unblockIp(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.riskDevices = asyncRoute(async (req, res) => {
  const r = await svc.listRiskDevices(req.query);
  sendList(res, r);
});

exports.blockDevice = asyncRoute(async (req, res) => {
  const r = await svc.blockDevice(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.unblockDevice = asyncRoute(async (req, res) => {
  const r = await svc.unblockDevice(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.userSessions = asyncRoute(async (req, res) => {
  const r = await svc.listUserSessions(req.params.id, req.query);
  sendList(res, r);
});

exports.revokeUserSessions = asyncRoute(async (req, res) => {
  const r = await svc.revokeUserSessions(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.unprotectUser = asyncRoute(async (req, res) => {
  const r = await svc.unprotectUser(req.params.id, req.body, req.user?.id, req);
  res.success(r.data, r.message);
});
