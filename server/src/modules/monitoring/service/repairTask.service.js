const repo = require('../repository/monitoring.repository');
const engine = require('./consistencyEngine.service');

const FINANCIAL_RULES = new Set([
  'PAYMENT_SUCCESS_ORDER_UNPAID',
  'ORDER_PAYMENT_AMOUNT_MISMATCH',
  'REFUND_AMOUNT_EXCEEDS_PAID',
  'POINTS_BALANCE_MISMATCH',
]);

async function createRepairTask(anomalyId, operatorId, remark = '') {
  const anomaly = await repo.findAnomalyById(anomalyId);
  if (!anomaly) throw new Error('异常不存在');
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

async function executeRepairTask(taskId, operatorId) {
  const task = await repo.findRepairTaskById(taskId);
  if (!task) throw new Error('修复任务不存在');
  if (task.repair_status === 'executed') return task;
  if (FINANCIAL_RULES.has(task.rule_code)) {
    await repo.updateRepairTask(taskId, { repair_status: 'failed', remark: '资金/支付/退款/积分异常禁止自动执行修复' });
    throw new Error('资金、支付、退款或积分异常禁止自动执行修复');
  }

  const anomaly = await repo.findAnomalyById(task.anomaly_id);
  const { db } = repo;
  let afterSnapshot = null;

  if (task.repair_type === 'sync_product_stock_from_variants' && task.entity_type === 'product') {
    const [[before]] = await db.query(`SELECT id, stock FROM products WHERE id = ?`, [task.entity_id]);
    await db.query(
      `UPDATE products p
       SET p.stock = COALESCE((
         SELECT SUM(v.stock)
         FROM product_variants v
         WHERE v.product_id = p.id
           AND v.deleted_at IS NULL
           AND (v.enabled IS NULL OR v.enabled = 1)
       ), 0)
       WHERE p.id = ?`,
      [task.entity_id],
    );
    const [[after]] = await db.query(`SELECT id, stock FROM products WHERE id = ?`, [task.entity_id]);
    afterSnapshot = { before, after };
  } else if (task.repair_type === 'clear_cache_key') {
    await db.query(`DELETE FROM cache_meta WHERE cache_key = ?`, [task.suggestion?.cacheKey || task.entity_id]);
    afterSnapshot = { cacheKey: task.suggestion?.cacheKey || task.entity_id, cleared: true };
  } else if (task.repair_type === 'recalculate_user_statistics' && task.entity_type === 'user') {
    const [[real]] = await db.query(
      `SELECT COUNT(*) AS valid_order_count, COALESCE(SUM(total_amount - COALESCE(refunded_amount, 0)), 0) AS total_spent
       FROM orders
       WHERE user_id = ? AND payment_status IN ('paid','partially_refunded','refunded') AND status <> 'cancelled'`,
      [task.entity_id],
    );
    await db.query(
      `INSERT INTO user_statistics (user_id, total_spent, valid_order_count, average_order_value)
       VALUES (?, ?, ?, IF(? > 0, ? / ?, 0))
       ON DUPLICATE KEY UPDATE
         total_spent = VALUES(total_spent),
         valid_order_count = VALUES(valid_order_count),
         average_order_value = VALUES(average_order_value),
         updated_at = NOW()`,
      [
        task.entity_id,
        Number(real.total_spent || 0),
        Number(real.valid_order_count || 0),
        Number(real.valid_order_count || 0),
        Number(real.total_spent || 0),
        Number(real.valid_order_count || 0),
      ],
    );
    afterSnapshot = { recalculated: real };
  } else {
    await repo.updateRepairTask(taskId, { repair_status: 'failed', remark: '当前修复类型未开放自动执行' });
    throw new Error('当前修复类型未开放自动执行');
  }

  await repo.updateRepairTask(taskId, {
    repair_status: 'executed',
    after_snapshot: afterSnapshot,
    operator_id: operatorId || task.operator_id || null,
    executed_at: new Date(),
  });
  await repo.markAnomalyStatus(task.anomaly_id, 'repaired', operatorId);
  if (anomaly) {
    await engine.rescanAnomaly(anomaly.id, { operatorId }).catch(() => {});
  }
  return repo.findRepairTaskById(taskId);
}

module.exports = {
  createRepairTask,
  executeRepairTask,
  FINANCIAL_RULES,
};
