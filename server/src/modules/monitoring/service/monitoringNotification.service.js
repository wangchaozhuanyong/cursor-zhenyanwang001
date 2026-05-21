const crypto = require('crypto');
const notificationRepo = require('../../admin/repository/adminNotification.repository');

async function notifyHighRisk(anomaly) {
  if (!['P0', 'P1'].includes(anomaly.severity)) return;
  const entityType = anomaly.entity_type || anomaly.entityType;
  const entityId = anomaly.entity_id || anomaly.entityId;
  const rootCause = anomaly.root_cause_message || anomaly.rootCauseMessage || '待分析';
  const ruleCode = anomaly.rule_code || anomaly.ruleCode;
  const title = `【高危数据异常】${anomaly.title}`;
  const content = `${entityType} ${entityId} 触发 ${ruleCode}。可能原因：${rootCause}。请进入数据一致性监控中心查看详情。`;
  const id = crypto.randomUUID();
  await notificationRepo.insertNotification({
    id,
    batchId: `monitoring_${id}`,
    userId: null,
    type: 'system',
    title,
    content,
    audienceType: 'all',
    linkUrl: `/admin/monitoring/anomalies/${anomaly.id}`,
    publishStatus: 'published',
    sendStatus: 'sent',
    workflowStatus: 'published',
    sentAt: new Date(),
  }).catch((error) => {
    console.warn('[monitoringNotification] failed:', error?.message || error);
  });
}

module.exports = { notifyHighRisk };
