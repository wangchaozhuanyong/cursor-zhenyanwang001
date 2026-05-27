const { asyncRoute } = require('../../../middleware/asyncRoute');
const queryService = require('../service/monitoringQuery.service');
const engine = require('../service/consistencyEngine.service');
const repairTaskService = require('../service/repairTask.service');
const autoFixService = require('../service/autoFix.service');
const cronMatcher = require('../service/cronMatcher.service');
const { reloadRulesCache } = require('../service/monitoringScheduler.service');
const { writeAuditLog } = require('../../../utils/auditLog');

function currentAdminId(req) {
  return req.user?.id || null;
}

function adminApi() {
  return /** @type {any} */ (require('../../admin')).api || {};
}

async function auditMonitoring(req, actionType, objectType, objectId, summary, result = 'success', extra = {}) {
  await writeAuditLog({
    req,
    operatorId: currentAdminId(req),
    actionType,
    objectType,
    objectId,
    summary,
    after: extra,
    result,
  });
}

async function emitMonitoringEvent(event) {
  const emitEvent = adminApi().emitEvent;
  if (typeof emitEvent !== 'function') return;
  await emitEvent({
    category: 'consistency',
    source: 'monitoring_admin_action',
    ...event,
  }, {
    operatorId: event.operatorId || null,
    operatorType: event.operatorId ? 'admin' : 'system',
  }).catch((error) => {
    console.warn('[monitoring.controller] admin event emit failed:', error?.message || error);
  });
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
  const detail = await queryService.getAnomalyDetail(req.params.id);
  if (!detail) return res.fail(404, '异常不存在');
  if (['P0', 'P1'].includes(String(detail.anomaly?.severity || '').toUpperCase()) && !String(req.body?.remark || '').trim()) {
    return res.fail(400, 'P0/P1 异常忽略必须填写备注');
  }
  const anomaly = await queryService.markAnomalyStatus(
    req.params.id,
    'ignored',
    currentAdminId(req),
    req.body?.remark || '',
  );
  if (!anomaly) return res.fail(404, '异常不存在');
  await auditMonitoring(req, 'monitoring.anomaly.ignore', 'data_consistency_anomaly', anomaly.id, `忽略监控异常 ${anomaly.rule_code}`, 'success', { remark: req.body?.remark || '' });
  await emitMonitoringEvent({
    eventType: 'monitoring.anomaly_ignored',
    severity: anomaly.severity,
    title: `监控异常已忽略：${anomaly.title}`,
    message: req.body?.remark || '',
    entityType: anomaly.entity_type,
    entityId: anomaly.entity_id,
    payload: { anomalyId: anomaly.id, ruleCode: anomaly.rule_code },
    operatorId: currentAdminId(req),
  });
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
  await auditMonitoring(req, 'monitoring.anomaly.resolve', 'data_consistency_anomaly', anomaly.id, `手动解决监控异常 ${anomaly.rule_code}`, 'success', { remark: req.body?.remark || '' });
  try {
    const autoResolve = adminApi().autoResolveEventByFingerprint;
    if (typeof autoResolve === 'function') {
      await autoResolve({
        eventType: anomaly.rule_code || anomaly.severity,
        entityType: anomaly.entity_type,
        entityId: anomaly.entity_id,
        anomalyId: anomaly.id || null,
      }, {
        operatorId: currentAdminId(req),
        remark: req.body?.remark || '监控异常手动解决后自动关闭后台事件',
        metadata: { anomalyId: anomaly.id, ruleCode: anomaly.rule_code },
      });
    }
  } catch (error) {
    console.warn('[monitoring.controller] auto resolve event failed:', error?.message || error);
  }
  await emitMonitoringEvent({
    eventType: 'monitoring.anomaly_resolved',
    severity: anomaly.severity,
    title: `监控异常已解决：${anomaly.title}`,
    message: req.body?.remark || '',
    entityType: anomaly.entity_type,
    entityId: anomaly.entity_id,
    payload: { anomalyId: anomaly.id, ruleCode: anomaly.rule_code },
    operatorId: currentAdminId(req),
  });
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

exports.approveRepairTask = asyncRoute(async (req, res) => {
  const task = await repairTaskService.approveRepairTask(req.params.id, currentAdminId(req), req.body?.remark || '');
  await auditMonitoring(req, 'monitoring.repair.approve', 'data_repair_task', task.id, `批准修复任务 #${task.id}`, 'success', { remark: req.body?.remark || '' });
  await emitMonitoringEvent({
    eventType: 'monitoring.repair_approved',
    severity: task.severity || 'P2',
    title: `修复任务已批准：${task.anomaly_title || task.rule_code}`,
    message: req.body?.remark || '',
    entityType: task.entity_type,
    entityId: task.entity_id,
    payload: { repairTaskId: task.id, anomalyId: task.anomaly_id, ruleCode: task.rule_code },
    operatorId: currentAdminId(req),
  });
  res.success(task, '修复任务已批准');
});

exports.rejectRepairTask = asyncRoute(async (req, res) => {
  const task = await repairTaskService.rejectRepairTask(req.params.id, currentAdminId(req), req.body?.remark || '');
  await auditMonitoring(req, 'monitoring.repair.reject', 'data_repair_task', task.id, `驳回修复任务 #${task.id}`, 'success', { remark: req.body?.remark || '' });
  res.success(task, '修复任务已驳回');
});

exports.cancelRepairTask = asyncRoute(async (req, res) => {
  const task = await repairTaskService.cancelRepairTask(req.params.id, currentAdminId(req), req.body?.remark || '');
  await auditMonitoring(req, 'monitoring.repair.cancel', 'data_repair_task', task.id, `取消修复任务 #${task.id}`, 'success', { remark: req.body?.remark || '' });
  res.success(task, '修复任务已取消');
});

exports.executeRepairTask = asyncRoute(async (req, res) => {
  const task = await repairTaskService.executeRepairTask(req.params.id, currentAdminId(req));
  await auditMonitoring(req, 'monitoring.repair.execute', 'data_repair_task', task.id, `执行修复任务 #${task.id}`, 'success', { ruleCode: task.rule_code, repairType: task.repair_type });
  await emitMonitoringEvent({
    eventType: 'monitoring.repair_executed',
    severity: task.severity || 'P2',
    title: `修复任务已执行：${task.anomaly_title || task.rule_code}`,
    message: `修复类型：${task.repair_type}`,
    entityType: task.entity_type,
    entityId: task.entity_id,
    payload: { repairTaskId: task.id, anomalyId: task.anomaly_id, ruleCode: task.rule_code },
    operatorId: currentAdminId(req),
  });
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
  await auditMonitoring(req, 'monitoring.rule.update', 'data_consistency_rule', rule.code, `更新监控规则 ${rule.code}`, 'success', { patch });
  await emitMonitoringEvent({
    eventType: 'monitoring.rule_updated',
    severity: rule.severity || 'P2',
    title: `监控规则已更新：${rule.title || rule.code}`,
    message: Object.keys(patch).join(', '),
    entityType: 'data_consistency_rule',
    entityId: rule.code,
    payload: { patch },
    operatorId: currentAdminId(req),
  });
  reloadRulesCache();
  res.success(rule, '规则已更新');
});

exports.runRule = asyncRoute(async (req, res) => {
  const result = await engine.runRule(req.params.code, {
    runType: 'manual',
    force: true,
    operatorId: currentAdminId(req),
  });
  await auditMonitoring(req, 'monitoring.rule.run', 'data_consistency_rule', req.params.code, `手动执行监控规则 ${req.params.code}`, 'success', result);
  res.success(result, '规则执行完成');
});

exports.listRuns = asyncRoute(async (req, res) => {
  const result = await queryService.listRuns(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});
