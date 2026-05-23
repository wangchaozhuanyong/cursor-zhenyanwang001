const repo = require('../repository/monitoring.repository');

async function orderCancelledStockNotRestored() {
  if (!(await repo.tableExists('inventory_stock_records'))) return { checkedCount: 0, anomalies: [] };
  const rows = await repo.selectCancelledOrdersWithoutStockRestore();
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'ORDER_CANCELLED_STOCK_NOT_RESTORED',
      module: 'order',
      severity: 'P2',
      entityType: 'order',
      entityId: row.id,
      title: `取消订单缺少库存回滚证据：${row.order_no || row.id}`,
      expectedValue: { restoreRecordExists: true },
      actualValue: { restoreRecordExists: false },
      diffValue: { restoreRecords: Number(row.restore_records || 0) },
      evidence: { orderNo: row.order_no, updatedAt: row.updated_at, detection: 'inventory_stock_records evidence only' },
      rootCauseCode: 'UNKNOWN',
      rootCauseMessage: '当前根据库存流水证据无法确认取消订单已回滚库存，请人工核查。',
      autoFixable: false,
      repairSuggestion: { repairType: 'manual_cancelled_order_stock_review', description: '请核对订单项、SKU 库存和库存流水后处理。' },
    })),
  };
}

module.exports = { ORDER_CANCELLED_STOCK_NOT_RESTORED: orderCancelledStockNotRestored };
