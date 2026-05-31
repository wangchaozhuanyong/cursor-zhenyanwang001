const repo = require('../repository/monitoring.repository');

async function analyticsPaymentSuccessMissing() {
  if (!(await repo.tableExists('orders'))) return { checkedCount: 0, anomalies: [] };
  if (!(await repo.tableExists('analytics_events'))) return { checkedCount: 0, anomalies: [] };
  if (!(await repo.columnExists('analytics_events', 'order_id'))) return { checkedCount: 0, anomalies: [] };

  const rows = await repo.selectPaidOrdersMissingPaymentSuccessEvents();
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'ANALYTICS_PAYMENT_SUCCESS_MISSING',
      module: 'analytics',
      severity: 'P2',
      entityType: 'order',
      entityId: row.id,
      title: `已支付订单缺少 payment_success 埋点：${row.order_no || row.id}`,
      expectedValue: { paymentSuccessEventExists: true },
      actualValue: { paymentSuccessEventExists: false },
      diffValue: { missingEventType: 'payment_success' },
      evidence: {
        orderNo: row.order_no,
        userId: row.user_id,
        paymentStatus: row.payment_status,
        orderStatus: row.status,
        amount: Number(row.amount || 0),
      },
      rootCauseCode: 'DERIVED_DATA_STALE',
      rootCauseMessage: '订单支付状态已完成，但用于客户端活动/转化报表的服务端埋点没有写入。',
      autoFixable: true,
      repairSuggestion: {
        repairType: 'backfill_payment_success_analytics_event',
        description: '按已支付订单补写一条服务端 payment_success 埋点，使用固定去重键，重复执行不会重复写入。',
      },
    })),
  };
}

module.exports = {
  ANALYTICS_PAYMENT_SUCCESS_MISSING: analyticsPaymentSuccessMissing,
};
