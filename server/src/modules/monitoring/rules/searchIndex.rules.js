const repo = require('../repository/monitoring.repository');

function normalizeIndexText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function productSearchKeywordsMismatch() {
  if (!(await repo.tableExists('products'))) return { checkedCount: 0, anomalies: [] };
  if (!(await repo.columnExists('products', 'search_keywords'))) return { checkedCount: 0, anomalies: [] };

  const rows = await repo.selectProductSearchKeywordRows();
  const anomalies = [];
  for (const row of rows) {
    const expected = normalizeIndexText(row.expected_search_keywords);
    const actual = normalizeIndexText(row.search_keywords);
    if (actual === expected) continue;

    anomalies.push({
      ruleCode: 'PRODUCT_SEARCH_KEYWORDS_MISMATCH',
      module: 'search',
      severity: 'P2',
      entityType: 'product',
      entityId: row.id,
      title: `商品搜索索引与商品主数据不一致：${row.name || row.id}`,
      expectedValue: { searchKeywords: expected },
      actualValue: { searchKeywords: actual },
      diffValue: { changed: actual !== expected },
      evidence: {
        productId: row.id,
        productName: row.name,
        source: 'products.search_keywords',
      },
      rootCauseCode: 'DERIVED_DATA_STALE',
      rootCauseMessage: '商品名称、描述、SKU 或标签变更后，搜索冗余字段没有同步重建。',
      autoFixable: true,
      repairSuggestion: {
        repairType: 'rebuild_product_search_keywords',
        description: '按当前商品、SKU、标签重新生成 products.search_keywords，重复执行不会产生副作用。',
        targetSearchKeywords: expected,
      },
    });
  }

  return { checkedCount: rows.length, anomalies };
}

module.exports = {
  PRODUCT_SEARCH_KEYWORDS_MISMATCH: productSearchKeywordsMismatch,
};
