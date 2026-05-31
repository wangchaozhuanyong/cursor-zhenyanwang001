const repo = require('../repository/monitoring.repository');
const repairTaskService = require('./repairTask.service');

const AUTOMATED_REPAIR_TYPES = new Set([
  'sync_product_stock_from_variants',
  'clear_cache_key',
  'recalculate_user_statistics',
  'rebuild_product_search_keywords',
  'backfill_payment_success_analytics_event',
]);

const AUTOMATED_RULES = new Set([
  'PRODUCT_STOCK_MISMATCH',
  'CACHE_STALE_AFTER_ADMIN_UPDATE',
  'USER_STATS_MISMATCH',
  'PRODUCT_SEARCH_KEYWORDS_MISMATCH',
  'ANALYTICS_PAYMENT_SUCCESS_MISSING',
]);

function isRuleAutoFixAllowed(ruleCode) {
  return AUTOMATED_RULES.has(ruleCode);
}

function isAutoFixCandidate(dbRule, anomaly) {
  if (!dbRule?.auto_fix_enabled) return false;
  if (!isRuleAutoFixAllowed(anomaly.rule_code || dbRule.code)) return false;
  if (repairTaskService.FINANCIAL_RULES.has(anomaly.rule_code || dbRule.code)) return false;
  if (['resolved', 'ignored', 'repaired', 'repair_pending'].includes(anomaly.status)) return false;

  const evidence = anomaly.evidence || {};
  if (!evidence.autoFixable) return false;

  const repairType = evidence.repairSuggestion?.repairType;
  return Boolean(repairType && AUTOMATED_REPAIR_TYPES.has(repairType));
}

async function hasPendingRepairTask(anomalyId) {
  return repo.hasPendingRepairTask(anomalyId);
}

async function processRuleAutoFix(dbRule, savedAnomalies = [], options = {}) {
  if (!dbRule?.auto_fix_enabled) return [];

  const createdTasks = [];
  for (const entry of savedAnomalies) {
    const anomaly = entry?.anomaly || entry;
    if (!anomaly?.id || !isAutoFixCandidate(dbRule, anomaly)) continue;
    if (await hasPendingRepairTask(anomaly.id)) continue;

    const task = await repairTaskService.createRepairTask(
      anomaly.id,
      options.operatorId || null,
      options.remark || '规则启用自动修复，系统自动创建修复任务',
    );
    const { enqueueRepairTask } = require('./monitoringScheduler.service');
    await enqueueRepairTask(task.id, {
      operatorId: options.operatorId || null,
      runType: 'auto_fix',
    });
    await repo.recordRuleEvent(dbRule.code, 'anomaly.auto_fix_enqueued', {
      anomalyId: anomaly.id,
      repairTaskId: task.id,
      repairType: task.repair_type,
    });
    createdTasks.push(task);
  }
  return createdTasks;
}

module.exports = {
  AUTOMATED_REPAIR_TYPES,
  AUTOMATED_RULES,
  isRuleAutoFixAllowed,
  isAutoFixCandidate,
  processRuleAutoFix,
};
