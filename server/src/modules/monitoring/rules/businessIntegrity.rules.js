const repo = require('../repository/monitoring.repository');

function anomaly(ruleCode, module, severity, entityType, entityId, title, evidence = {}) {
  return {
    ruleCode,
    module,
    severity,
    entityType,
    entityId,
    title,
    expectedValue: evidence.expectedValue ?? null,
    actualValue: evidence.actualValue ?? null,
    diffValue: evidence.diffValue ?? null,
    evidence,
    rootCauseCode: evidence.rootCauseCode || 'BUSINESS_INTEGRITY_RISK',
    rootCauseMessage: evidence.rootCauseMessage || '业务状态或冗余数据存在不一致，需要人工核查。',
    autoFixable: false,
    repairSuggestion: { repairType: 'manual_review', description: '请核对业务单据、流水和审计日志后处理。' },
  };
}

async function has(table, column) {
  return repo.tableExists(table).then((ok) => (ok ? repo.columnExists(table, column) : false));
}

async function emptyRule() {
  return { checkedCount: 0, anomalies: [] };
}

async function orderPaidButNoStockRecord() {
  if (!(await repo.tableExists('orders')) || !(await repo.tableExists('inventory_stock_records'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT o.id, o.order_no
       FROM orders o
       LEFT JOIN inventory_stock_records r ON (r.order_no_snapshot = o.order_no OR r.source_no = o.order_no)
      WHERE o.payment_status = 'paid'
        AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY o.id, o.order_no
     HAVING COUNT(r.id) = 0
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('ORDER_PAID_BUT_NO_STOCK_RECORD', 'order', 'P1', 'order', r.id, `已支付订单缺少库存扣减记录：${r.order_no || r.id}`, r)) };
}

async function orderCompletedButUserStatsNotUpdated() {
  if (!(await repo.tableExists('orders')) || !(await repo.tableExists('user_statistics'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT o.user_id, COUNT(*) AS real_count, COALESCE(us.valid_order_count, 0) AS stat_count
       FROM orders o
       LEFT JOIN user_statistics us ON us.user_id = o.user_id
      WHERE o.status = 'completed'
      GROUP BY o.user_id, us.valid_order_count
     HAVING real_count <> stat_count
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('ORDER_COMPLETED_BUT_USER_STATS_NOT_UPDATED', 'order', 'P2', 'user', r.user_id, `完成订单未同步用户统计：${r.user_id}`, r)) };
}

async function orderStatusIllegalTransition() {
  if (!(await repo.tableExists('orders'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT id, order_no, status, payment_status
       FROM orders
      WHERE (status IN ('shipped','completed') AND payment_status <> 'paid')
         OR (status = 'cancelled' AND payment_status = 'paid')
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('ORDER_STATUS_ILLEGAL_TRANSITION', 'order', 'P1', 'order', r.id, `订单状态疑似非法流转：${r.order_no || r.id}`, r)) };
}

async function orderShippedWithoutTracking() {
  if (!(await repo.tableExists('orders')) || !(await has('orders', 'tracking_no'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT id, order_no, status, tracking_no
       FROM orders
      WHERE status = 'shipped' AND (tracking_no IS NULL OR tracking_no = '')
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('ORDER_SHIPPED_WITHOUT_TRACKING', 'order', 'P2', 'order', r.id, `已发货订单缺少物流信息：${r.order_no || r.id}`, r)) };
}

async function orderCancelledButPaymentPaid() {
  if (!(await repo.tableExists('orders'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT id, order_no, status, payment_status
       FROM orders
      WHERE status = 'cancelled' AND payment_status = 'paid'
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('ORDER_CANCELLED_BUT_PAYMENT_PAID', 'order', 'P0', 'order', r.id, `订单已取消但支付仍成功：${r.order_no || r.id}`, r)) };
}

async function returnRequestTimeout() {
  if (!(await repo.tableExists('return_requests'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT id, order_id, status, created_at
       FROM return_requests
      WHERE status IN ('pending','requested') AND created_at <= DATE_SUB(NOW(), INTERVAL 2 DAY)
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('RETURN_REQUEST_TIMEOUT', 'refund', 'P1', 'return_request', r.id, `售后申请超时未处理：${r.id}`, r)) };
}

async function refundPendingTooLong() {
  if (!(await repo.tableExists('refunds'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT id, order_id, status, created_at
       FROM refunds
      WHERE status IN ('pending','processing') AND created_at <= DATE_SUB(NOW(), INTERVAL 1 DAY)
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('REFUND_PENDING_TOO_LONG', 'refund', 'P1', 'refund', r.id, `退款长时间待处理：${r.id}`, r)) };
}

async function refundSuccessOrderStatusMismatch() {
  if (!(await repo.tableExists('refunds')) || !(await repo.tableExists('orders'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT rf.id, rf.order_id, o.order_no, o.refund_status
       FROM refunds rf
       JOIN orders o ON o.id = rf.order_id
      WHERE rf.status IN ('success','succeeded','refunded')
        AND (o.refund_status IS NULL OR o.refund_status NOT IN ('refunded','partially_refunded'))
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('REFUND_SUCCESS_ORDER_STATUS_MISMATCH', 'refund', 'P1', 'refund', r.id, `退款成功但订单状态不一致：${r.order_no || r.order_id}`, r)) };
}

async function returnApprovedButNoRefund() {
  if (!(await repo.tableExists('return_requests')) || !(await repo.tableExists('refunds'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT rr.id, rr.order_id
       FROM return_requests rr
       LEFT JOIN refunds rf ON rf.order_id = rr.order_id
      WHERE rr.status IN ('approved','accepted') AND rf.id IS NULL
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('RETURN_APPROVED_BUT_NO_REFUND', 'refund', 'P1', 'return_request', r.id, `售后已同意但未退款：${r.id}`, r)) };
}

async function couponStockNegative() {
  if (!(await repo.tableExists('coupons'))) return emptyRule();
  const stockColumn = await has('coupons', 'stock') ? 'stock' : await has('coupons', 'remaining_count') ? 'remaining_count' : '';
  if (!stockColumn) return emptyRule();
  const [rows] = await repo.db.query(`SELECT id, title, ${stockColumn} AS stock FROM coupons WHERE ${stockColumn} < 0 LIMIT 200`);
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('COUPON_STOCK_NEGATIVE', 'coupon', 'P1', 'coupon', r.id, `优惠券库存为负：${r.title || r.id}`, r)) };
}

async function couponUsedButOrderUnpaid() {
  if (!(await repo.tableExists('user_coupons')) || !(await repo.tableExists('orders'))) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT uc.id, uc.coupon_id, uc.order_id, o.payment_status
       FROM user_coupons uc
       JOIN orders o ON o.id = uc.order_id
      WHERE uc.status = 'used' AND o.payment_status <> 'paid'
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('COUPON_USED_BUT_ORDER_UNPAID', 'coupon', 'P1', 'user_coupon', r.id, `未支付订单使用优惠券：${r.id}`, r)) };
}

async function couponExpiredButAvailable() {
  if (!(await repo.tableExists('coupons')) || !(await has('coupons', 'use_end_at'))) return emptyRule();
  const statusColumn = await has('coupons', 'publish_status') ? 'publish_status' : await has('coupons', 'status') ? 'status' : '';
  if (!statusColumn) return emptyRule();
  const [rows] = await repo.db.query(
    `SELECT id, title, ${statusColumn} AS status, use_end_at
       FROM coupons
      WHERE use_end_at < NOW() AND ${statusColumn} IN ('active','enabled','published')
      LIMIT 200`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly('COUPON_EXPIRED_BUT_AVAILABLE', 'coupon', 'P2', 'coupon', r.id, `过期优惠券仍可用：${r.title || r.id}`, r)) };
}

async function notificationChannelFailed(ruleCode, channel, severity, titlePrefix) {
  if (!(await repo.tableExists('notification_logs')) || !(await has('notification_logs', 'status'))) return emptyRule();
  const hasChannel = await has('notification_logs', 'channel');
  const whereChannel = hasChannel ? 'AND channel = ?' : '';
  const params = hasChannel ? [channel] : [];
  const [rows] = await repo.db.query(
    `SELECT * FROM notification_logs
      WHERE status IN ('failed','error') ${whereChannel}
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      LIMIT 200`,
    params,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly(ruleCode, 'notification', severity, 'notification_log', r.id, `${titlePrefix}：${r.id}`, r)) };
}

async function simpleTableRule(ruleCode, module, table, statusColumn, badStatuses, severity, entityType, titlePrefix) {
  if (!(await repo.tableExists(table)) || !(await has(table, statusColumn)) || !(await has(table, 'updated_at'))) return emptyRule();
  const placeholders = badStatuses.map(() => '?').join(',');
  const [rows] = await repo.db.query(
    `SELECT * FROM ${table} WHERE ${statusColumn} IN (${placeholders}) AND updated_at <= DATE_SUB(NOW(), INTERVAL 1 HOUR) LIMIT 200`,
    badStatuses,
  );
  return { checkedCount: rows.length, anomalies: rows.map((r) => anomaly(ruleCode, module, severity, entityType, r.id, `${titlePrefix}：${r.id}`, r)) };
}

module.exports = {
  ORDER_PAID_BUT_NO_STOCK_RECORD: orderPaidButNoStockRecord,
  ORDER_COMPLETED_BUT_USER_STATS_NOT_UPDATED: orderCompletedButUserStatsNotUpdated,
  ORDER_STATUS_ILLEGAL_TRANSITION: orderStatusIllegalTransition,
  ORDER_SHIPPED_WITHOUT_TRACKING: orderShippedWithoutTracking,
  ORDER_CANCELLED_BUT_PAYMENT_PAID: orderCancelledButPaymentPaid,
  RETURN_REQUEST_TIMEOUT: returnRequestTimeout,
  REFUND_PENDING_TOO_LONG: refundPendingTooLong,
  REFUND_SUCCESS_ORDER_STATUS_MISMATCH: refundSuccessOrderStatusMismatch,
  RETURN_APPROVED_BUT_NO_REFUND: returnApprovedButNoRefund,
  COUPON_STOCK_NEGATIVE: couponStockNegative,
  COUPON_CLAIMED_BUT_NO_RECORD: () => emptyRule(),
  COUPON_USED_BUT_ORDER_UNPAID: couponUsedButOrderUnpaid,
  COUPON_EXPIRED_BUT_AVAILABLE: couponExpiredButAvailable,
  MEMBER_LEVEL_MISMATCH: () => emptyRule(),
  POINTS_EXPIRED_JOB_FAILED: () => simpleTableRule('POINTS_EXPIRED_JOB_FAILED', 'loyalty', 'data_consistency_runs', 'status', ['failed'], 'P1', 'monitoring_run', '积分过期任务失败'),
  POINTS_USED_BUT_ORDER_CANCELLED: () => emptyRule(),
  BIRTHDAY_GIFT_DUPLICATE: () => emptyRule(),
  REFERRAL_REWARD_PENDING_TOO_LONG: () => simpleTableRule('REFERRAL_REWARD_PENDING_TOO_LONG', 'referral', 'referral_rewards', 'status', ['pending'], 'P2', 'referral_reward', '邀请奖励长时间待结算'),
  INVITE_RELATION_DUPLICATE: () => emptyRule(),
  REFERRAL_REWARD_AMOUNT_MISMATCH: () => emptyRule(),
  NOTIFICATION_BATCH_FAILED: () => simpleTableRule('NOTIFICATION_BATCH_FAILED', 'notification', 'notification_batches', 'status', ['failed'], 'P2', 'notification_batch', '通知批次失败'),
  TELEGRAM_NOTIFY_FAILED: () => notificationChannelFailed('TELEGRAM_NOTIFY_FAILED', 'telegram', 'P1', 'Telegram 通知失败'),
  SMS_SEND_FAILED: () => notificationChannelFailed('SMS_SEND_FAILED', 'sms', 'P2', '短信发送失败'),
  NOTIFICATION_RECIPIENT_STUCK: () => simpleTableRule('NOTIFICATION_RECIPIENT_STUCK', 'notification', 'notification_recipients', 'status', ['pending', 'sending'], 'P2', 'notification_recipient', '通知收件人卡住'),
  MYINVOIS_SUBMIT_FAILED: () => simpleTableRule('MYINVOIS_SUBMIT_FAILED', 'myinvois', 'myinvois_documents', 'status', ['failed'], 'P1', 'myinvois_document', 'MyInvois 提交失败'),
  MYINVOIS_RETRY_STUCK: () => simpleTableRule('MYINVOIS_RETRY_STUCK', 'myinvois', 'myinvois_documents', 'status', ['retrying'], 'P2', 'myinvois_document', 'MyInvois 重试卡住'),
  MYINVOIS_DOCUMENT_STATUS_MISMATCH: () => emptyRule(),
};
