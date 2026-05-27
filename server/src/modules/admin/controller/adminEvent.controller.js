const { asyncRoute } = require('../../../middleware/asyncRoute');
const eventBus = require('../service/adminEventBus.service');
const service = require('../service/adminEvent.service');

exports.stream = asyncRoute(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const removeClient = eventBus.addClient(res);
  req.on('close', removeClient);
});

exports.list = asyncRoute(async (req, res) => {
  const result = await service.listEvents(req.query, req.user.id);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.summary = asyncRoute(async (req, res) => {
  res.success(await service.getSummary(req.user.id, req.query));
});

exports.bossMetrics = asyncRoute(async (_req, res) => {
  res.success(await service.getBossMetrics());
});

exports.rules = asyncRoute(async (_req, res) => {
  res.success(await service.listRules());
});

exports.markRead = asyncRoute(async (req, res) => {
  res.success(await service.markUserState(req.params.id, req.user.id, 'read'));
});

exports.hide = asyncRoute(async (req, res) => {
  res.success(await service.markUserState(req.params.id, req.user.id, 'hidden'));
});

exports.markSoundPlayed = asyncRoute(async (req, res) => {
  res.success(await service.markUserState(req.params.id, req.user.id, 'sound_played'));
});

exports.markPopupSeen = asyncRoute(async (req, res) => {
  res.success(await service.markUserState(req.params.id, req.user.id, 'popup_seen'));
});

exports.acknowledge = asyncRoute(async (req, res) => {
  res.success(await service.acknowledge(req.params.id, req.user.id, req.body || {}));
});

exports.startProgress = asyncRoute(async (req, res) => {
  res.success(await service.startProgress(req.params.id, req.user.id, req.body || {}));
});

exports.resolve = asyncRoute(async (req, res) => {
  res.success(await service.resolve(req.params.id, req.user.id, req.body || {}));
});

exports.ignore = asyncRoute(async (req, res) => {
  res.success(await service.ignore(req.params.id, req.user.id, req.body || {}));
});

function notImplemented(res, action) {
  if (typeof res.fail === 'function') return res.fail(`事件中心能力暂未启用：${action}`, 501);
  return res.status(501).json({ message: `事件中心能力暂未启用：${action}` });
}

// 兼容：部分分支/环境路由已引用但 controller 可能尚未实现的接口
exports.updateRule = asyncRoute(async (_req, res) => notImplemented(res, 'updateRule'));
exports.exportEvents = asyncRoute(async (_req, res) => notImplemented(res, 'exportEvents'));
exports.batchRead = asyncRoute(async (_req, res) => notImplemented(res, 'batchRead'));
exports.batchAcknowledge = asyncRoute(async (_req, res) => notImplemented(res, 'batchAcknowledge'));
exports.batchIgnore = asyncRoute(async (_req, res) => notImplemented(res, 'batchIgnore'));
exports.batchResolve = asyncRoute(async (_req, res) => notImplemented(res, 'batchResolve'));
exports.batchAssign = asyncRoute(async (_req, res) => notImplemented(res, 'batchAssign'));
exports.detail = asyncRoute(async (_req, res) => notImplemented(res, 'detail'));
exports.actions = asyncRoute(async (_req, res) => notImplemented(res, 'actions'));
