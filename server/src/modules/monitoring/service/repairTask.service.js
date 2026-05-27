const repo = require('../repository/monitoring.repository');
const engine = require('./consistencyEngine.service');
const { NotFoundError, ValidationError } = require('../../../errors');

const FINANCIAL_RULES = new Set([
  'PAYMENT_SUCCESS_ORDER_UNPAID',
  'ORDER_PAYMENT_AMOUNT_MISMATCH',
  'REFUND_AMOUNT_EXCEEDS_PAID',
  'POINTS_BALANCE_MISMATCH',
]);

const EXECUTABLE_REPAIR_TYPES = new Set([
  'sync_product_stock_from_variants',
  'clear_cache_key',
  'recalculate_user_statistics',
]);

async function createRepairTask(anomalyId, operatorId, remark = '') {
  const anomaly = await repo.findAnomalyById(anomalyId);
  if (!anomaly) throw new NotFoundError('异常不存在');
  const suggestion = anomaly.evidence?.repairSuggestion || {
    repairType: FINANCIAL_RULES.has(anomaly.rule_code) ? 'manual_review_only' : 'manual_review',
    description: FINANCIAL_RULES.has(anomaly.rule_code)
      ? '资金、支付、退款或积分异常禁止自动修复，请人工确认。'
      : '请人工确认后处理。',
  };
  return repo.createRepairTask({
    anomalyId,
    repairType: suggestion.repairType || 'manual_review',
    suggestion,
    operatorId,
    remark,
    beforeSnapshot: anomaly,
  });
}

function isFinancialRule(ruleCode) {
  return FINANCIAL_RULES.has(ruleCode);
}

async function approveRepairTask(taskId, operatorId, remark = '', options = {}) {
  const task = await repo.findRepairTaskById(taskId);
  if (!task) throw new NotFoundError('修复任务不存在');
  if (task.repair_status === 'executed') throw new ValidationError('已执行的修复任务不能重复审批');
  if (isFinancialRule(task.rule_code)) {
    throw new ValidationError('资金、支付、退款或积分异常禁止自动执行修复，只能人工处理');
  }
  if (!EXECUTABLE_REPAIR_TYPES.has(task.repair_type)) {
    throw new ValidationError('当前修复类型未开放自动执行，不能批准执行');
  }
  return repo.approveRepairTask(taskId, {
    operatorId,
    source: options.source || 'manual',
    remark,
  });
}

async function rejectRepairTask(taskId, operatorId, remark = '') {
  const task = await repo.findRepairTaskById(taskId);
  if (!task) throw new NotFoundError('修复任务不存在');
  if (task.repair_status === 'executed') throw new ValidationError('已执行的修复任务不能驳回');
  return repo.rejectRepairTask(taskId, { operatorId, remark });
}

async function cancelRepairTask(taskId, operatorId, remark = '') {
  const task = await repo.findRepairTaskById(taskId);
  if (!task) throw new NotFoundError('修复任务不存在');
  if (task.repair_status === 'executed') throw new ValidationError('已执行的修复任务不能取消');
  return repo.cancelRepairTask(taskId, { operatorId, remark });
}

async function executeRepairTask(taskId, operatorId) {
  const task = await repo.findRepairTaskById(taskId);
  if (!task) throw new NotFoundError('修复任务不存在');
  if (task.repair_status === 'executed') return task;
  if (task.approval_status !== 'approved' || task.repair_status !== 'approved') {
    throw new ValidationError('修复任务必须先审批通过后才能执行');
  }
  if (!['approved'].includes(task.repair_status)) {
    throw new ValidationError('当前修复任务状态不允许执行');
  }
  if (isFinancialRule(task.rule_code)) {
    await repo.updateRepairTask(taskId, { repair_status: 'failed', remark: '资金/支付/退款/积分异常禁止自动执行修复' });
    throw new ValidationError('资金、支付、退款或积分异常禁止自动执行修复，请人工确认后处理');
  }
  if (!EXECUTABLE_REPAIR_TYPES.has(task.repair_type)) {
    await repo.updateRepairTask(taskId, { repair_status: 'failed', remark: '当前修复类型未开放自动执行' });
    throw new ValidationError('当前修复类型未开放自动执行，请人工确认后处理');
  }

  const anomaly = await repo.findAnomalyById(task.anomaly_id);
  let afterSnapshot = null;

  if (task.repair_type === 'sync_product_stock_from_variants' && task.entity_type === 'product') {
    afterSnapshot = await repo.syncProductStockFromVariants(task.entity_id);
  } else if (task.repair_type === 'clear_cache_key') {
    await repo.clearCacheKey(task.suggestion?.cacheKey || task.entity_id);
    afterSnapshot = { cacheKey: task.suggestion?.cacheKey || task.entity_id, cleared: true };
  } else if (task.repair_type === 'recalculate_user_statistics' && task.entity_type === 'user') {
    const real = await repo.recalculateUserStatistics(task.entity_id);
    afterSnapshot = { recalculated: real };
  } else {
    await repo.updateRepairTask(taskId, { repair_status: 'failed', remark: '当前修复类型未开放自动执行' });
    throw new ValidationError('当前修复类型未开放自动执行，请人工确认后处理');
  }

  await repo.updateRepairTask(taskId, {
    repair_status: 'executed',
    after_snapshot: afterSnapshot,
    operator_id: operatorId || task.operator_id || null,
    executed_at: new Date(),
    execution_log: {
      executedBy: operatorId || task.operator_id || null,
      executedAt: new Date().toISOString(),
      repairType: task.repair_type,
      approvalStatus: task.approval_status,
      approvalSource: task.approval_source || null,
    },
    rollback_suggestion: {
      strategy: 'manual_review',
      description: '如修复结果异常，请根据 before_snapshot 手动回滚并重新执行监控规则确认。',
    },
  });
  await repo.markAnomalyStatus(task.anomaly_id, 'repaired', operatorId);
  if (anomaly) {
    await engine.rescanAnomaly(anomaly.id, { operatorId }).catch(() => {});
  }
  return repo.findRepairTaskById(taskId);
}

module.exports = {
  createRepairTask,
  approveRepairTask,
  rejectRepairTask,
  cancelRepairTask,
  executeRepairTask,
  isFinancialRule,
  FINANCIAL_RULES,
  EXECUTABLE_REPAIR_TYPES,
};
