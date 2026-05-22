const { asyncRoute } = require('../../../middleware/asyncRoute');
const svc = require('../service/adminPoints.service');

exports.listRecords = asyncRoute(async (req, res) => {
  const data = await svc.listRecords(req.query);
  res.success(data);
});

exports.getSettings = asyncRoute(async (_req, res) => {
  const data = await svc.getSettings();
  res.success(data);
});

exports.updateSettings = asyncRoute(async (req, res) => {
  const data = await svc.updateSettings(req.body, req);
  res.success(data, '积分设置已保存');
});

exports.listProductRules = asyncRoute(async (req, res) => {
  const data = await svc.listProductRules(req.query);
  res.success(data);
});

exports.createProductRule = asyncRoute(async (req, res) => {
  const data = await svc.createProductRule(req.body, req);
  res.success(data, '规则已创建');
});

exports.updateProductRule = asyncRoute(async (req, res) => {
  const id = String(req.params.id);
  const data = await svc.updateProductRule(id, req.body, req);
  res.success(data, '规则已更新');
});

exports.deleteProductRule = asyncRoute(async (req, res) => {
  const id = String(req.params.id);
  await svc.deleteProductRule(id, req);
  res.success(null, '规则已停用');
});

exports.runPointsExpireJob = asyncRoute(async (req, res) => {
  const data = await svc.runPointsExpireJob(req);
  res.success(data, '积分过期任务已执行');
});
