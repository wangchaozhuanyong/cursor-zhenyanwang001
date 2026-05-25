const { asyncRoute } = require('../../../middleware/asyncRoute');
const queryService = require('../service/monitoringQuery.service');
const engine = require('../service/consistencyEngine.service');
const repairTaskService = require('../service/repairTask.service');
const autoFixService = require('../service/autoFix.service');
const cronMatcher = require('../service/cronMatcher.service');
const { reloadRulesCache } = require('../service/monitoringScheduler.service');

function currentAdminId(req) {
  return req.user?.id || null;
}

exports.getOverview = asyncRoute(async (_req, res) => {
  res.success(await queryService.getOverview());
});

exports.listAnomalies = asyncRoute(async (req, res) => {
  const result = await queryService.listAnomalies(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getAnomalyDetail = asyncRoute(async (req, res) => {
  const detail = await queryService.getAnomalyDetail(req.params.id);
  if (!detail) return res.fail(404, '异常不存在');
  res.success(detail);
});

exports.rescanAnomaly = asyncRoute(async (req, res) => {
  const data = await engine.rescanAnomaly(req.params.id, { operatorId: currentAdminId(req), force: true });
  res.success(data, '复查完成');
});

exports.ignoreAnomaly = asyncRoute(async (req, res) => {
  const anomaly = await queryService.markAnomalyStatus(
    req.params.id,
    'ignored',
    currentAdminId(req),
    req.body?.remark || '',
  );
  if (!anomaly) return res.fail(404, '异常不存在');
  res.success(anomaly, '已忽略');
});

exports.resolveAnomaly = asyncRoute(async (req, res) => {
  const anomaly = await queryService.markAnomalyStatus(
    req.params.id,
    'resolved',
    currentAdminId(req),
    req.body?.remark || '',
  );
  if (!anomaly) return res.fail(404, '异常不存在');
  res.success(anomaly, '已标记解决');
});

exports.createRepairTask = asyncRoute(async (req, res) => {
  const task = await repairTaskService.createRepairTask(req.params.id, currentAdminId(req), req.body?.remark || '');
  res.success(task, '修复任务已创建');
});

exports.listRepairTasks = asyncRoute(async (req, res) => {
  const result = await queryService.listRepairTasks(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.executeRepairTask = asyncRoute(async (req, res) => {
  const task = await repairTaskService.executeRepairTask(req.params.id, currentAdminId(req));
  res.success(task, '修复任务已执行');
});

exports.listRules = asyncRoute(async (_req, res) => {
  res.success(await queryService.listRules());
});

exports.updateRule = asyncRoute(async (req, res) => {
  const patch = {};
  for (const key of ['enabled', 'severity', 'schedule_cron', 'auto_fix_enabled']) {
    if (req.body?.[key] !== undefined) patch[key] = req.body[key];
  }
  if (patch.schedule_cron !== undefined && patch.schedule_cron !== null && patch.schedule_cron !== '') {
    if (!cronMatcher.isValidExpression(patch.schedule_cron)) {
      return res.fail(400, 'schedule_cron 格式无效，需为 5 段标准 cron（分 时 日 月 周）');
    }
  }
  if (patch.auto_fix_enabled && !autoFixService.isRuleAutoFixAllowed(req.params.code)) {
    return res.fail(400, '该规则涉及资金、积分、文件或人工判断场景，不允许开启自动修复');
  }
  const rule = await queryService.updateRule(req.params.code, patch);
  if (!rule) return res.fail(404, '监控规则不存在');
  reloadRulesCache();
  res.success(rule, '规则已更新');
});

exports.runRule = asyncRoute(async (req, res) => {
  const result = await engine.runRule(req.params.code, {
    runType: 'manual',
    force: true,
    operatorId: currentAdminId(req),
  });
  res.success(result, '规则执行完成');
});

exports.listRuns = asyncRoute(async (req, res) => {
  const result = await queryService.listRuns(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});
