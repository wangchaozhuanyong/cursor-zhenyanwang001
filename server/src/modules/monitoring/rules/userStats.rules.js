const repo = require('../repository/monitoring.repository');

async function userStatsMismatch() {
  if (!(await repo.tableExists('user_statistics'))) return { checkedCount: 0, anomalies: [] };
  const rows = await repo.selectUserStatsMismatches();
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
