const { asyncRoute } = require('../../../middleware/asyncRoute');
const telegramService = require('../../telegram/service/telegram.service');

exports.getStatus = asyncRoute(async (_req, res) => {
  res.success(await telegramService.getStatus());
});

exports.getSettings = asyncRoute(async (_req, res) => {
  res.success(await telegramService.getAdminSettings());
});

exports.updateSettings = asyncRoute(async (req, res) => {
  const data = await telegramService.saveAdminSettings(req.body, req.user?.id, req);
  res.success(data, 'Telegram 设置已保存');
});

exports.previewMessage = asyncRoute(async (req, res) => {
  const data = await telegramService.buildMessagePreview(req.body || {});
  res.success(data);
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
