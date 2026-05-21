const { asyncRoute } = require('../../../middleware/asyncRoute');
const eventBus = require('../service/adminEventBus.service');

exports.stream = asyncRoute(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const removeClient = eventBus.addClient(res);
  req.on('close', removeClient);
});
