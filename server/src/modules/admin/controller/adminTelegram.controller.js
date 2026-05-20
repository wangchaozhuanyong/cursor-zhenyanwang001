const { asyncRoute } = require('../../../middleware/asyncRoute');

function getTelegramApi() {
  return /** @type {any} */ (require('../../telegram')).api || {};
}

function requireTelegramApi(name) {
  const fn = getTelegramApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Telegram 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

exports.getStatus = asyncRoute(async (_req, res) => {
  res.success(requireTelegramApi('getStatus')());
});

exports.testSend = asyncRoute(async (_req, res) => {
  const result = await requireTelegramApi('sendTestMessage')();
  res.success(result, 'Telegram 测试消息已发送');
});

exports.listLogs = asyncRoute(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const list = await requireTelegramApi('listLogs')(limit);
  res.success(list);
});
