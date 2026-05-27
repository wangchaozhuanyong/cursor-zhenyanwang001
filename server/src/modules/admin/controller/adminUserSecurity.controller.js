const { asyncRoute } = require('../../../middleware/asyncRoute');

/**
 * 注意：该 controller 作为兼容层，用于避免路由引用缺失导致服务启动失败。
 *
 * 当前仓库 `admin.routes.js` 已经挂载了 `/user-security/*` 路由，
 * 但历史版本中 controller 文件可能缺失。这里先提供“最小可运行”实现：
 * - 保证线上服务能启动、健康检查通过
 * - 对外返回 501，提示功能暂未启用（后续可再接入真实 service / repository）
 */

function notImplemented(res, action) {
  return res.fail?.(`用户安全能力暂未启用：${action}`, 501) ?? res.status(501).json({ message: `用户安全能力暂未启用：${action}` });
}

exports.overview = asyncRoute(async (_req, res) => notImplemented(res, 'overview'));
exports.loginAttempts = asyncRoute(async (_req, res) => notImplemented(res, 'loginAttempts'));
exports.events = asyncRoute(async (_req, res) => notImplemented(res, 'events'));
exports.riskIps = asyncRoute(async (_req, res) => notImplemented(res, 'riskIps'));
exports.blockIp = asyncRoute(async (_req, res) => notImplemented(res, 'blockIp'));
exports.unblockIp = asyncRoute(async (_req, res) => notImplemented(res, 'unblockIp'));
exports.riskDevices = asyncRoute(async (_req, res) => notImplemented(res, 'riskDevices'));
exports.blockDevice = asyncRoute(async (_req, res) => notImplemented(res, 'blockDevice'));
exports.unblockDevice = asyncRoute(async (_req, res) => notImplemented(res, 'unblockDevice'));
exports.userSessions = asyncRoute(async (_req, res) => notImplemented(res, 'userSessions'));
exports.revokeUserSessions = asyncRoute(async (_req, res) => notImplemented(res, 'revokeUserSessions'));
exports.unprotectUser = asyncRoute(async (_req, res) => notImplemented(res, 'unprotectUser'));

const { asyncRoute } = require('../../../middleware/asyncRoute');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../../security/repository/clientSecurity.repository');
const clientSecurity = require('../../security/service/clientSecurity.service');

function bodyString(req, key, fallback = '') {
  const value = req.body?.[key];
  return Array.isArray(value) ? String(value[0] || fallback) : String(value || fallback);
}

exports.overview = asyncRoute(async (_req, res) => {
  res.success(await repo.selectSecurityOverview());
});

exports.loginAttempts = asyncRoute(async (req, res) => {
  res.success({ list: await repo.listLoginAttempts(req.query) });
});

exports.events = asyncRoute(async (req, res) => {
  res.success({ list: await repo.listSecurityEvents(req.query) });
});

exports.riskIps = asyncRoute(async (_req, res) => {
  res.success({ list: await repo.listRiskIps() });
});

exports.blockIp = asyncRoute(async (req, res) => {
  const ip = bodyString(req, 'ip').trim();
  await repo.blockIp(ip, bodyString(req, 'reason', 'admin_block'), bodyString(req, 'blockedUntil') || null);
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'security.client_ip_block', objectType: 'ip', objectId: ip, summary: `封禁高风险 IP ${ip}`, after: req.body, result: 'success' });
  res.success(null, 'IP 已封禁');
});

exports.unblockIp = asyncRoute(async (req, res) => {
  const ip = bodyString(req, 'ip').trim();
  await repo.unblockIp(ip);
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'security.client_ip_unblock', objectType: 'ip', objectId: ip, summary: `解除 IP 封禁 ${ip}`, result: 'success' });
  res.success(null, 'IP 已解除封禁');
});

exports.riskDevices = asyncRoute(async (_req, res) => {
  res.success({ list: await repo.listRiskDevices() });
});

exports.blockDevice = asyncRoute(async (req, res) => {
  const deviceId = (bodyString(req, 'deviceId') || bodyString(req, 'device_id')).trim();
  await repo.blockDevice(deviceId, bodyString(req, 'reason', 'admin_block'), bodyString(req, 'blockedUntil') || null);
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'security.client_device_block', objectType: 'device', objectId: deviceId, summary: `封禁高风险设备 ${deviceId}`, after: req.body, result: 'success' });
  res.success(null, '设备已封禁');
});

exports.unblockDevice = asyncRoute(async (req, res) => {
  const deviceId = (bodyString(req, 'deviceId') || bodyString(req, 'device_id')).trim();
  await repo.unblockDevice(deviceId);
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'security.client_device_unblock', objectType: 'device', objectId: deviceId, summary: `解除设备封禁 ${deviceId}`, result: 'success' });
  res.success(null, '设备已解除封禁');
});

exports.userSessions = asyncRoute(async (req, res) => {
  const userId = String(req.params.id || '');
  res.success({ list: await clientSecurity.listSessions(userId) });
});

exports.revokeUserSessions = asyncRoute(async (req, res) => {
  const userId = String(req.params.id || '');
  await clientSecurity.revokeAllSessions(userId, clientSecurity.buildContext(req, req.body), 'admin_revoked');
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'security.client_sessions_revoked', objectType: 'user', objectId: userId, summary: `后台撤销用户会话 ${userId}`, result: 'success' });
  res.success(null, '用户会话已撤销');
});

exports.unprotectUser = asyncRoute(async (req, res) => {
  const userId = String(req.params.id || '');
  await repo.unprotectUser(userId);
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'security.client_account_unprotect', objectType: 'user', objectId: userId, summary: `解除账号保护 ${userId}`, result: 'success' });
  res.success(null, '账号保护已解除');
});
