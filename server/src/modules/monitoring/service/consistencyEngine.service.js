const repo = require('../repository/monitoring.repository');
const registry = require('./ruleRegistry.service');
const rootCauseAnalyzer = require('./rootCauseAnalyzer.service');
const notification = require('./monitoringNotification.service');
const autoFix = require('./autoFix.service');

function normalizeAnomaly(item, rule = {}) {
  return {
    ...item,
    severity: item.severity || rule.severity || 'P2',
    module: item.module || rule.module || 'system',
    entityId: String(item.entityId),
    expectedValue: item.expectedValue ?? null,
    actualValue: item.actualValue ?? null,
    diffValue: item.diffValue ?? null,
    evidence: {
      ...(item.evidence || {}),
      autoFixable: Boolean(item.autoFixable),
      repairSuggestion: item.repairSuggestion || null,
    },
  };
}

async function upsertAnomaly(item, rule) {
  const normalized = normalizeAnomaly(item, rule);
  const root = await rootCauseAnalyzer.analyze(normalized);
  normalized.rootCauseCode = root.code;
  normalized.rootCauseMessage = root.message || normalized.rootCauseMessage || '';
  const result = await repo.upsertAnomaly(normalized);
  if (result.inserted) {
    await notification.notifyHighRisk(result.anomaly);
  }
  return result.anomaly;
}

async function runRule(ruleCode, options = {}) {
  const runner = registry.getRuleRunner(ruleCode);
  if (!runner) throw new Error(`Unknown monitoring rule: ${ruleCode}`);
  const dbRule = await repo.getRule(ruleCode);
  if (!dbRule && !options.ignoreDbRuleMissing) throw new Error(`Rule not seeded: ${ruleCode}`);
  if (dbRule && dbRule.enabled === false && !options.force) {
    return { checkedCount: 0, anomalyCount: 0, anomalies: [], skipped: true };
  }

  const runId = await repo.createRun({ runType: options.runType || 'manual', ruleCode });
  const started = Date.now();
  try {
    await repo.recordRuleEvent(ruleCode, 'rule.run.started', { runId, options });
    const output = await runner(options);
    const rawAnomalies = output.anomalies || [];
    const saved = [];
    for (const item of rawAnomalies) {
      saved.push(await upsertAnomaly(item, dbRule || {}));
    }
    const autoFixTasks = await autoFix.processRuleAutoFix(dbRule, saved, options);
    await repo.finishRun(runId, {
      status: 'success',
      checkedCount: output.checkedCount ?? rawAnomalies.length,
      anomalyCount: saved.length,
      errorMessage: null,
    });
    await repo.recordRuleEvent(ruleCode, 'rule.run.finished', {
      runId,
      durationMs: Date.now() - started,
      anomalyCount: saved.length,
      autoFixTaskCount: autoFixTasks.length,
    });
    return {
      runId,
      checkedCount: output.checkedCount ?? rawAnomalies.length,
      anomalyCount: saved.length,
      anomalies: saved,
      autoFixTasks,
    };
  } catch (error) {
    await repo.finishRun(runId, { status: 'failed', checkedCount: 0, anomalyCount: 0, errorMessage: error.message });
    await repo.recordRuleEvent(ruleCode, 'rule.run.failed', { runId, error: error.message });
    throw error;
  }
}

async function runAllEnabledRules(options = {}) {
  const rules = await repo.listEnabledRules();
  const results = [];
  for (const rule of rules) {
    if (!registry.hasRule(rule.code)) continue;
    try {
      results.push(await runRule(rule.code, { ...options, runType: options.runType || 'scheduled_all' }));
    } catch (error) {
      results.push({ ruleCode: rule.code, error: error.message, failed: true });
    }
  }
  return results;
}

async function rescanAnomaly(anomalyId, options = {}) {
  const anomaly = await repo.findAnomalyById(anomalyId);
  if (!anomaly) throw new Error('异常不存在');
  const result = await runRule(anomaly.rule_code, { ...options, force: true, runType: 'rescan' });
  const matched = result.anomalies.find((item) => (
    item.rule_code === anomaly.rule_code
    && item.entity_type === anomaly.entity_type
    && String(item.entity_id) === String(anomaly.entity_id)
  ));
  if (!matched) {
    try {
      await require('../../admin/service/adminEvent.service').autoResolveByFingerprint({
        eventType: anomaly.rule_code || anomaly.severity,
        entityType: anomaly.entity_type,
        entityId: anomaly.entity_id,
        anomalyId: anomaly.id || null,
      }, {
        operatorId: options.operatorId || null,
        remark: '数据一致性重新扫描正常后自动关闭',
        metadata: { anomalyId },
      });
    } catch (error) {
      console.warn('[consistencyEngine] auto resolve admin event failed:', error?.message || error);
    }
    return repo.markAnomalyStatus(anomalyId, 'resolved', options.operatorId);
  }
  return matched;
}

module.exports = {
  runRule,
  runAllEnabledRules,
  rescanAnomaly,
  normalizeAnomaly,
  upsertAnomaly,
};
