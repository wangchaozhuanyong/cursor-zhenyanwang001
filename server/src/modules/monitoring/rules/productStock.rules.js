const repo = require('../repository/monitoring.repository');
const { eq } = require('../monitoringSql');

async function productStockMismatch() {
  const { db } = repo;
  if (!(await repo.tableExists('product_variants'))) return { checkedCount: 0, anomalies: [] };
  const hasProductDeletedAt = await repo.columnExists('products', 'deleted_at');
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.stock AS product_stock,
            COALESCE(SUM(CASE WHEN (v.deleted_at IS NULL) AND (v.enabled IS NULL OR v.enabled = 1) THEN v.stock ELSE 0 END), 0) AS sku_stock
     FROM products p
     LEFT JOIN product_variants v ON ${eq('v.product_id', 'p.id')}
     ${hasProductDeletedAt ? 'WHERE p.deleted_at IS NULL' : ''}
     GROUP BY p.id, p.name, p.stock
     HAVING product_stock <> sku_stock`,
  );
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'PRODUCT_STOCK_MISMATCH',
      module: 'product',
      severity: 'P2',
      entityType: 'product',
      entityId: row.id,
      title: `商品库存与 SKU 汇总不一致：${row.name || row.id}`,
      expectedValue: { productStock: Number(row.sku_stock || 0) },
      actualValue: { productStock: Number(row.product_stock || 0) },
      diffValue: { diff: Number(row.product_stock || 0) - Number(row.sku_stock || 0) },
      evidence: { productId: row.id, productName: row.name, source: 'products/product_variants' },
      rootCauseCode: 'UNKNOWN',
      rootCauseMessage: '商品主库存未与 SKU 汇总保持一致。',
      autoFixable: true,
      repairSuggestion: {
        repairType: 'sync_product_stock_from_variants',
        description: '以启用且未删除的 SKU 库存汇总为准，更新 products.stock。',
        targetStock: Number(row.sku_stock || 0),
      },
    })),
  };
}

async function skuNegativeStock() {
  const { db } = repo;
  if (!(await repo.tableExists('product_variants'))) return { checkedCount: 0, anomalies: [] };
  const [rows] = await db.query(
    `SELECT v.id, v.product_id, v.sku_code, v.title, v.stock, p.name AS product_name
     FROM product_variants v
     LEFT JOIN products p ON ${eq('p.id', 'v.product_id')}
     WHERE v.stock < 0 AND v.deleted_at IS NULL`,
  );
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'SKU_NEGATIVE_STOCK',
      module: 'product',
      severity: 'P1',
      entityType: 'product_variant',
      entityId: row.id,
      title: `SKU 库存为负数：${row.product_name || row.product_id}`,
      expectedValue: { minStock: 0 },
      actualValue: { stock: Number(row.stock || 0) },
      diffValue: { diff: Number(row.stock || 0) },
      evidence: {
        productId: row.product_id,
        productName: row.product_name,
        skuCode: row.sku_code,
        variantTitle: row.title,
      },
      rootCauseCode: 'UNKNOWN',
      rootCauseMessage: '可能存在重复扣库存、人工调整错误或并发写入冲突。',
      autoFixable: false,
      repairSuggestion: {
        repairType: 'manual_inventory_review',
        description: '请检查订单扣库存、退款/取消回滚和人工库存调整记录后处理。',
      },
    })),
  };
}

module.exports = {
  PRODUCT_STOCK_MISMATCH: productStockMismatch,
  SKU_NEGATIVE_STOCK: skuNegativeStock,
};
