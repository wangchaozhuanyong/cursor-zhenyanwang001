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
  res.success(await service.getSummary(req.user.id));
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
