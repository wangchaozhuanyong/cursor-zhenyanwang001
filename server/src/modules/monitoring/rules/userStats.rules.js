const repo = require('../repository/monitoring.repository');
const { eq } = require('../monitoringSql');

async function userStatsMismatch() {
  const { db } = repo;
  if (!(await repo.tableExists('user_statistics'))) return { checkedCount: 0, anomalies: [] };
  const hasRefundedAmount = await repo.columnExists('orders', 'refunded_amount');
  const [rows] = await db.query(
    `SELECT u.id AS user_id, u.phone, u.nickname,
            COALESCE(us.total_spent, 0) AS stat_total_spent,
            COALESCE(us.valid_order_count, 0) AS stat_valid_order_count,
            COALESCE(real.total_spent, 0) AS real_total_spent,
            COALESCE(real.valid_order_count, 0) AS real_valid_order_count
     FROM users u
     LEFT JOIN user_statistics us ON ${eq('us.user_id', 'u.id')}
     LEFT JOIN (
       SELECT user_id,
              COUNT(*) AS valid_order_count,
              SUM(total_amount${hasRefundedAmount ? ' - COALESCE(refunded_amount, 0)' : ''}) AS total_spent
       FROM orders
       WHERE payment_status IN ('paid','partially_refunded','refunded')
         AND status <> 'cancelled'
       GROUP BY user_id
     ) real ON ${eq('real.user_id', 'u.id')}
     WHERE u.deleted_at IS NULL
       AND (
         ABS(COALESCE(us.total_spent, 0) - COALESCE(real.total_spent, 0)) > 0.01
         OR COALESCE(us.valid_order_count, 0) <> COALESCE(real.valid_order_count, 0)
       )`,
  );
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'USER_STATS_MISMATCH',
      module: 'user',
      severity: 'P2',
      entityType: 'user',
      entityId: row.user_id,
      title: `用户统计与真实业务数据不一致：${row.nickname || row.phone || row.user_id}`,
      expectedValue: {
        totalSpent: Number(row.real_total_spent || 0),
        validOrderCount: Number(row.real_valid_order_count || 0),
      },
      actualValue: {
        totalSpent: Number(row.stat_total_spent || 0),
        validOrderCount: Number(row.stat_valid_order_count || 0),
      },
      diffValue: {
        totalSpentDiff: Number(row.stat_total_spent || 0) - Number(row.real_total_spent || 0),
        validOrderCountDiff: Number(row.stat_valid_order_count || 0) - Number(row.real_valid_order_count || 0),
      },
      evidence: { userId: row.user_id, phone: row.phone, nickname: row.nickname },
      rootCauseCode: 'ASYNC_JOB_FAILED',
      rootCauseMessage: '用户统计冗余字段可能未随订单/退款事件同步。',
      autoFixable: true,
      repairSuggestion: { repairType: 'recalculate_user_statistics', description: '按订单真实数据重算低风险统计字段。' },
    })),
  };
}

module.exports = { USER_STATS_MISMATCH: userStatsMismatch };
