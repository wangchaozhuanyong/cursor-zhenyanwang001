const repo = require('../repository/monitoring.repository');

async function analyticsPaymentSuccessMissing() {
  if (!(await repo.tableExists('orders'))) return { checkedCount: 0, anomalies: [] };
  if (!(await repo.tableExists('analytics_events'))) return { checkedCount: 0, anomalies: [] };
  if (!(await repo.columnExists('analytics_events', 'order_id'))) return { checkedCount: 0, anomalies: [] };

  const rows = await repo.selectPaidOrdersMissingPaymentSuccessEvents();
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => {
      const eventExists = Boolean(row.payment_success_event_id);
      return {
        ruleCode: 'ANALYTICS_PAYMENT_SUCCESS_MISSING',
        module: 'analytics',
        severity: 'P2',
        entityType: 'order',
        entityId: row.id,
        title: `已支付订单缺少 payment_success 埋点：${row.order_no || row.id}`,
        expectedValue: {
          paymentSuccessEventExists: true,
          keyword: row.expected_keyword || '',
        },
        actualValue: {
          paymentSuccessEventExists: eventExists,
          keyword: row.payment_success_keyword || '',
        },
        diffValue: {
          missingEventType: eventExists ? null : 'payment_success',
          missingKeyword: eventExists && Boolean(row.expected_keyword),
        },
        evidence: {
          orderNo: row.order_no,
          userId: row.user_id,
          paymentStatus: row.payment_status,
          orderStatus: row.status,
          amount: Number(row.amount || 0),
          expectedKeyword: row.expected_keyword || '',
          existingPaymentSuccessEventId: row.payment_success_event_id || null,
          anomalyKind: eventExists ? 'payment_success_keyword_missing' : 'payment_success_event_missing',
        },
        rootCauseCode: 'DERIVED_DATA_STALE',
        rootCauseMessage: '订单支付状态已完成，但用于客户端活动和转化报表的服务端埋点缺失或字段不完整。',
        autoFixable: true,
        repairSuggestion: {
          repairType: 'backfill_payment_success_analytics_event',
          description: '按已支付订单补写或补齐服务端 payment_success 埋点，使用固定去重键，重复执行不会重复写入。',
        },
      };
    }),
  };
}

module.exports = {
  ANALYTICS_PAYMENT_SUCCESS_MISSING: analyticsPaymentSuccessMissing,
};
