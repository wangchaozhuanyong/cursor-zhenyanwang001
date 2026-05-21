const adminEventService = require('../../admin/service/adminEvent.service');

async function notifyHighRisk(anomaly) {
  if (!['P0', 'P1'].includes(anomaly.severity)) return;
  const entityType = anomaly.entity_type || anomaly.entityType;
  const entityId = anomaly.entity_id || anomaly.entityId;
  const rootCause = anomaly.root_cause_message || anomaly.rootCauseMessage || '待分析';
  const ruleCode = anomaly.rule_code || anomaly.ruleCode;

  await adminEventService.emitEvent({
    eventType: ruleCode || (anomaly.severity === 'P0' ? 'consistency.anomaly_p0' : 'consistency.anomaly_p1'),
    category: 'consistency',
    severity: anomaly.severity,
    title: anomaly.title || '数据一致性异常',
    message: `${entityType} ${entityId} 触发 ${ruleCode}。可能原因：${rootCause}。请进入数据一致性监控中心查看详情。`,
    entityType,
    entityId,
    fingerprint: {
      eventType: ruleCode || anomaly.severity,
      entityType,
      entityId,
      anomalyId: anomaly.id || null,
    },
    payload: {
      anomalyId: anomaly.id,
      ruleCode,
      rootCause,
      linkUrl: `/admin/monitoring/anomalies/${anomaly.id}`,
    },
    source: 'data_consistency_monitoring',
  }).catch((error) => {
    console.warn('[monitoringNotification] event emit failed:', error?.message || error);
  });
}

module.exports = { notifyHighRisk };
