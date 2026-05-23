const repo = require('../repository/monitoring.repository');

async function refundAmountExceedsPaid() {
  if (!(await repo.columnExists('orders', 'refunded_amount'))) return { checkedCount: 0, anomalies: [] };
  const rows = await repo.selectRefundAmountExceedsPaidOrders();
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'REFUND_AMOUNT_EXCEEDS_PAID',
      module: 'payment',
      severity: 'P0',
      entityType: 'order',
      entityId: row.id,
      title: `退款金额超过实付金额：${row.order_no || row.id}`,
      expectedValue: { maxRefundAmount: Number(row.total_amount || 0) },
      actualValue: { refundedAmount: Number(row.refunded_amount || 0) },
      diffValue: { diff: Number(row.refunded_amount || 0) - Number(row.total_amount || 0) },
      evidence: { orderNo: row.order_no, paymentStatus: row.payment_status, refundStatus: row.refund_status },
      rootCauseCode: 'UNKNOWN',
      rootCauseMessage: '退款累计金额超过订单实付金额，需财务人工核查。',
      autoFixable: false,
      repairSuggestion: { repairType: 'manual_refund_review', description: '禁止自动修复，请核对支付和退款凭证。' },
    })),
  };
}

module.exports = { REFUND_AMOUNT_EXCEEDS_PAID: refundAmountExceedsPaid };
