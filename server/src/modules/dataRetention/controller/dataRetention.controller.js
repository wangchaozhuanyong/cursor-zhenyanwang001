const { asyncRoute } = require('../../../middleware/asyncRoute');
const service = require('../service/dataRetention.service');

exports.overview = asyncRoute(async (_req, res) => {
  res.success(await service.getOverview());
});

exports.listPolicies = asyncRoute(async (_req, res) => {
  res.success(await service.listPolicies());
});

exports.updatePolicy = asyncRoute(async (req, res) => {
  const data = await service.updatePolicy(req.params.key, req.body, req);
  res.success(data, '清理策略已更新');
});

exports.resetDefaults = asyncRoute(async (req, res) => {
  const data = await service.resetDefaults(req);
  res.success(data, '清理策略已重置');
});

exports.preview = asyncRoute(async (req, res) => {
  const data = await service.createPreview(req.body, req);
  res.success(data, '清理预览已生成');
});

exports.createRun = asyncRoute(async (req, res) => {
  const data = await service.executeRun(req.body, req);
  res.success(data, '清理任务已执行');
});

exports.listRuns = asyncRoute(async (req, res) => {
  const result = await service.listRuns(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getRun = asyncRoute(async (req, res) => {
  res.success(await service.getRun(req.params.id));
});

exports.cancelRun = asyncRoute(async (req, res) => {
  const data = await service.cancelRun(req.params.id, req);
  res.success(data, '已请求取消清理任务');
});
