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
      title: `取消订单缺少库存释放证据：${row.order_no || row.id}`,
      expectedValue: { restoreRecordExists: true },
      actualValue: { restoreRecordExists: false },
      diffValue: { restoreRecords: Number(row.restore_records || 0) },
      evidence: { orderNo: row.order_no, updatedAt: row.updated_at, detection: 'inventory_stock_records release evidence' },
      rootCauseCode: 'ORDER_CANCELLED_STOCK_NOT_RESTORED',
      rootCauseMessage: '订单已取消，但监控没有找到库存释放流水。请先核对订单明细、SKU 库存和库存流水，避免重复加库存。',
      autoFixable: false,
      repairSuggestion: { repairType: 'manual_cancelled_order_stock_review', description: '请核对订单项、SKU 库存和库存流水后处理。' },
    })),
  };
}

module.exports = { ORDER_CANCELLED_STOCK_NOT_RESTORED: orderCancelledStockNotRestored };
