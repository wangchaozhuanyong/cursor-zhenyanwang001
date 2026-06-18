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

function csvCell(value) {
  if (value == null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

exports.updateRule = asyncRoute(async (req, res) => {
  const result = await service.updateRule(req.params.eventType, req.body || {}, req.user.id);
  res.success(result.data, result.message);
});

exports.exportEvents = asyncRoute(async (req, res) => {
  const result = await service.exportEvents(req.query || {}, req.user.id);
  const headers = ['id', 'eventType', 'category', 'severity', 'status', 'title', 'entityType', 'entityId', 'seenCount', 'lastSeenAt'];
  const rows = [headers.join(',')].concat(
    result.data.map((row) => headers.map((key) => csvCell(row[key])).join(',')),
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
  res.send(`\uFEFF${rows.join('\n')}`);
});

exports.batchRead = asyncRoute(async (req, res) => {
  const result = await service.batchRead(req.body || {}, req.user.id);
  res.success(result.data, result.message);
});

exports.batchAcknowledge = asyncRoute(async (req, res) => {
  const result = await service.batchAcknowledge(req.body || {}, req.user.id);
  res.success(result.data, result.message);
});

exports.batchIgnore = asyncRoute(async (req, res) => {
  const result = await service.batchIgnore(req.body || {}, req.user.id);
  res.success(result.data, result.message);
});

exports.batchResolve = asyncRoute(async (req, res) => {
  const result = await service.batchResolve(req.body || {}, req.user.id);
  res.success(result.data, result.message);
});

exports.batchAssign = asyncRoute(async (req, res) => {
  const result = await service.batchAssign(req.body || {}, req.user.id);
  res.success(result.data, result.message);
});

exports.assign = asyncRoute(async (req, res) => {
  const result = await service.assignEvent(req.params.id, req.user.id, req.body || {});
  res.success(result.data, result.message);
});

exports.detail = asyncRoute(async (req, res) => {
  const result = await service.getEventDetail(req.params.id, req.user.id);
  res.success(result.data);
});

exports.actions = asyncRoute(async (req, res) => {
  const result = await service.getEventActions(req.params.id);
  res.success(result.data);
});
