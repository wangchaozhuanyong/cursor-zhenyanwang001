const repo = require('../repository/monitoring.repository');

async function pointsBalanceMismatch() {
  const { rows, hasAccounts } = await repo.selectPointsBalanceMismatches();
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'POINTS_BALANCE_MISMATCH',
      module: 'loyalty',
      severity: 'P1',
      entityType: 'user',
      entityId: row.user_id,
      title: `用户积分余额与流水不一致：${row.nickname || row.phone || row.user_id}`,
      expectedValue: { ledgerBalance: Number(row.ledger_balance || 0) },
      actualValue: { accountBalance: Number(row.account_balance || 0), userPointsBalance: Number(row.points_balance || 0) },
      diffValue: { diff: Number(row.account_balance || 0) - Number(row.ledger_balance || 0) },
      evidence: { userId: row.user_id, phone: row.phone, nickname: row.nickname, hasPointsAccounts: hasAccounts },
      rootCauseCode: 'UNKNOWN',
      rootCauseMessage: '积分账户余额与流水汇总不一致，可能存在漏记流水或人工调整未闭环。',
      autoFixable: false,
      repairSuggestion: {
        repairType: 'manual_points_adjustment_review',
        description: '可生成补差流水建议，但禁止直接自动修复积分余额。',
      },
    })),
  };
}

module.exports = { POINTS_BALANCE_MISMATCH: pointsBalanceMismatch };
