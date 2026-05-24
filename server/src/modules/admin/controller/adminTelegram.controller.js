const { asyncRoute } = require('../../../middleware/asyncRoute');
const telegramService = require('../service/adminTelegram.service');

exports.getStatus = asyncRoute(async (_req, res) => {
  const data = await telegramService.getStatus();
  res.success(data);
});

exports.getSettings = asyncRoute(async (_req, res) => {
  const data = await telegramService.getSettings();
  res.success(data);
});

exports.updateSettings = asyncRoute(async (req, res) => {
  const data = await telegramService.updateSettings(req.body, req.user?.id, req);
  res.success(data, 'Telegram 设置已保存');
});

exports.previewMessage = asyncRoute(async (req, res) => {
  const data = await telegramService.previewMessage(req.body);
  res.success(data);
});

exports.testSend = asyncRoute(async (_req, res) => {
  const result = await telegramService.testSend();
  res.success(result, 'Telegram 测试消息已发送');
});

exports.listLogs = asyncRoute(async (req, res) => {
  const list = await telegramService.listLogs(req.query);
  res.success(list);
});
