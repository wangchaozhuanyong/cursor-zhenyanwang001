const repo = require('../repository/monitoring.repository');

async function analyze(anomaly) {
  if (anomaly.rootCauseCode && anomaly.rootCauseCode !== 'UNKNOWN') {
    return { code: anomaly.rootCauseCode, message: anomaly.rootCauseMessage || '' };
  }
  if (anomaly.ruleCode === 'FILE_OBJECT_MISSING') {
    return { code: 'FILE_OBJECT_MISSING', message: '数据库文件路径对应的对象不存在。' };
  }
  if (anomaly.ruleCode === 'CACHE_STALE_AFTER_ADMIN_UPDATE') {
    return { code: 'CACHE_STALE', message: '数据库更新时间晚于缓存更新时间。' };
  }
  const events = await repo.listDataChangeEvents(anomaly.entityType, anomaly.entityId, 5).catch(() => []);
  if (events.some((event) => event.source === 'admin' || event.actor_type === 'admin')) {
    return { code: 'MANUAL_ADMIN_EDIT', message: '最近存在后台人工修改记录，可能与异常相关。' };
  }
  if (anomaly.ruleCode === 'PAYMENT_SUCCESS_ORDER_UNPAID' || anomaly.ruleCode === 'ORDER_PAYMENT_AMOUNT_MISMATCH') {
    return { code: 'ASYNC_JOB_FAILED', message: '支付回调或订单状态流转可能未完整执行。' };
  }
  return { code: 'UNKNOWN', message: '暂未识别明确根因。' };
}

module.exports = { analyze };
