const { asyncRoute } = require('../../../middleware/asyncRoute');
const telegramService = require('../service/telegram.service');

exports.getStatus = asyncRoute(async (_req, res) => {
  res.success(telegramService.getStatus());
});

exports.testSend = asyncRoute(async (_req, res) => {
  const result = await telegramService.sendTestMessage();
  res.success(result, 'Telegram 测试消息已发送');
});

exports.listLogs = asyncRoute(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const list = await telegramService.listLogs(limit);
  res.success(list);
});
