const { asyncRoute } = require('../../../middleware/asyncRoute');
const repo = require('../repository/monitoring.repository');
const engine = require('../service/consistencyEngine.service');
const repairTaskService = require('../service/repairTask.service');
const cronMatcher = require('../service/cronMatcher.service');
const { reloadRulesCache } = require('../service/monitoringScheduler.service');

function currentAdminId(req) {
  return req.user?.id || null;
}

exports.getOverview = asyncRoute(async (_req, res) => {
  res.success(await repo.getOverview());
});

exports.listAnomalies = asyncRoute(async (req, res) => {
  const result = await repo.listAnomalies(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getAnomalyDetail = asyncRoute(async (req, res) => {
  const anomaly = await repo.findAnomalyById(req.params.id);
  if (!anomaly) return res.fail(404, '异常不存在');

  const [changeEvents, repairTasks, runs] = await Promise.all([
    repo.listDataChangeEvents(anomaly.entity_type, anomaly.entity_id, 20),
    repo.listRepairTasks({ anomalyId: anomaly.id, pageSize: 20 }),
    repo.listRuns({ ruleCode: anomaly.rule_code, pageSize: 20 }),
  ]);

  res.success({
    anomaly,
    changeEvents,
    repairTasks: repairTasks.list,
    runs: runs.list,
  });
});

exports.rescanAnomaly = asyncRoute(async (req, res) => {
  const data = await engine.rescanAnomaly(req.params.id, { operatorId: currentAdminId(req), force: true });
  res.success(data, '复查完成');
});

exports.ignoreAnomaly = asyncRoute(async (req, res) => {
  const anomaly = await repo.markAnomalyStatus(req.params.id, 'ignored', currentAdminId(req));
  if (!anomaly) return res.fail(404, '异常不存在');
  await repo.recordRuleEvent(anomaly.rule_code, 'anomaly.ignored', {
    anomalyId: anomaly.id,
    operatorId: currentAdminId(req),
    remark: req.body?.remark || '',
  });
  res.success(anomaly, '已忽略');
});

exports.resolveAnomaly = asyncRoute(async (req, res) => {
  const anomaly = await repo.markAnomalyStatus(req.params.id, 'resolved', currentAdminId(req));
  if (!anomaly) return res.fail(404, '异常不存在');
  await repo.recordRuleEvent(anomaly.rule_code, 'anomaly.resolved', {
    anomalyId: anomaly.id,
    operatorId: currentAdminId(req),
    remark: req.body?.remark || '',
  });
  res.success(anomaly, '已标记解决');
});

exports.createRepairTask = asyncRoute(async (req, res) => {
  const task = await repairTaskService.createRepairTask(req.params.id, currentAdminId(req), req.body?.remark || '');
  res.success(task, '修复任务已创建');
});

exports.listRepairTasks = asyncRoute(async (req, res) => {
  const result = await repo.listRepairTasks(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.executeRepairTask = asyncRoute(async (req, res) => {
  const task = await repairTaskService.executeRepairTask(req.params.id, currentAdminId(req));
  res.success(task, '修复任务已执行');
});

exports.listRules = asyncRoute(async (_req, res) => {
  res.success(await repo.listRules());
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
  const rule = await repo.updateRule(req.params.code, patch);
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
  const result = await repo.listRuns(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});
