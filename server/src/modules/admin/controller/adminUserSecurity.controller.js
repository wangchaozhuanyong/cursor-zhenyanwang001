const { asyncRoute } = require('../../../middleware/asyncRoute');

function notImplemented(res, action) {
  // 优先兼容项目已有的 res.fail/res.success 规范；不存在时退化为标准 Express 返回
  if (typeof res.fail === 'function') return res.fail(`用户安全能力暂未启用：${action}`, 501);
  return res.status(501).json({ message: `用户安全能力暂未启用：${action}` });
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
