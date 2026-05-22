const repo = require('../repository/monitoring.repository');
const { eq } = require('../monitoringSql');

async function paymentSuccessOrderUnpaid() {
  const { db } = repo;
  if (!(await repo.tableExists('payment_orders'))) return { checkedCount: 0, anomalies: [] };
  const [rows] = await db.query(
    `SELECT po.id AS payment_order_id, po.order_id, po.order_no, po.amount, po.status AS payment_order_status,
            po.payment_transaction_no, o.status AS order_status, o.payment_status, o.total_amount
     FROM payment_orders po
     JOIN orders o ON ${eq('o.id', 'po.order_id')}
     WHERE po.status = 'paid'
       AND (o.payment_status IS NULL OR o.payment_status <> 'paid')
       AND o.status NOT IN ('refunded','cancelled')`,
  );
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'PAYMENT_SUCCESS_ORDER_UNPAID',
      module: 'payment',
      severity: 'P0',
      entityType: 'order',
      entityId: row.order_id,
      title: `支付成功但订单未支付：${row.order_no || row.order_id}`,
      expectedValue: { orderStatus: 'paid', paymentStatus: 'paid' },
      actualValue: { orderStatus: row.order_status, paymentStatus: row.payment_status || 'pending' },
      diffValue: { paymentOrderStatus: row.payment_order_status },
      evidence: {
        paymentOrderId: row.payment_order_id,
        orderNo: row.order_no,
        paymentAmount: Number(row.amount || 0),
        orderAmount: Number(row.total_amount || 0),
        paymentTransactionNo: row.payment_transaction_no,
      },
      rootCauseCode: 'ASYNC_JOB_FAILED',
      rootCauseMessage: '支付已成功，但订单支付状态流转未完成，可能是回调处理失败或异步任务失败。',
      autoFixable: false,
      repairSuggestion: {
        repairType: 'manual_replay_payment_success',
        description: '人工核对支付流水后，重新执行订单支付成功状态流转。',
      },
    })),
  };
}

async function orderPaymentAmountMismatch() {
  const { db } = repo;
  if (!(await repo.tableExists('payment_orders'))) return { checkedCount: 0, anomalies: [] };
  const [rows] = await db.query(
    `SELECT o.id AS order_id, o.order_no, o.total_amount,
            COALESCE(SUM(po.amount), 0) AS paid_amount,
            GROUP_CONCAT(po.id ORDER BY po.created_at) AS payment_order_ids
     FROM orders o
     JOIN payment_orders po ON ${eq('po.order_id', 'o.id')} AND po.status = 'paid'
     WHERE o.payment_status IN ('paid','partially_refunded','refunded') OR o.status IN ('paid','shipped','completed','refunding','refunded')
     GROUP BY o.id, o.order_no, o.total_amount
     HAVING ABS(COALESCE(SUM(po.amount), 0) - o.total_amount) > 0.01`,
  );
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'ORDER_PAYMENT_AMOUNT_MISMATCH',
      module: 'payment',
      severity: 'P0',
      entityType: 'order',
      entityId: row.order_id,
      title: `订单金额与支付金额不一致：${row.order_no || row.order_id}`,
      expectedValue: { payableAmount: Number(row.total_amount || 0) },
      actualValue: { paidAmount: Number(row.paid_amount || 0) },
      diffValue: { diff: Number(row.paid_amount || 0) - Number(row.total_amount || 0) },
      evidence: {
        orderNo: row.order_no,
        paymentOrderIds: String(row.payment_order_ids || '').split(',').filter(Boolean),
      },
      rootCauseCode: 'UNKNOWN',
      rootCauseMessage: '可能存在重复支付、金额配置错误、支付回调乱序或人工调整。',
      autoFixable: false,
      repairSuggestion: {
        repairType: 'manual_payment_amount_review',
        description: '展示订单金额、支付金额、优惠、运费、退款记录，由财务人工确认。',
      },
    })),
  };
}

module.exports = {
  PAYMENT_SUCCESS_ORDER_UNPAID: paymentSuccessOrderUnpaid,
  ORDER_PAYMENT_AMOUNT_MISMATCH: orderPaymentAmountMismatch,
};
