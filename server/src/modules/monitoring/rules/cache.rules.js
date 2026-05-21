const repo = require('../repository/monitoring.repository');

async function cacheStaleAfterAdminUpdate() {
  const { db } = repo;
  if (!(await repo.tableExists('cache_meta'))) return { checkedCount: 0, anomalies: [] };
  const [rows] = await db.query(
    `SELECT cache_key, module, entity_type, entity_id, cache_updated_at, db_updated_at
     FROM cache_meta
     WHERE db_updated_at IS NOT NULL AND cache_updated_at < db_updated_at`,
  );
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'CACHE_STALE_AFTER_ADMIN_UPDATE',
      module: 'cache',
      severity: 'P2',
      entityType: row.entity_type || 'cache',
      entityId: row.entity_id || row.cache_key,
      title: `缓存早于数据库更新：${row.cache_key}`,
      expectedValue: { cacheUpdatedAt: row.db_updated_at },
      actualValue: { cacheUpdatedAt: row.cache_updated_at },
      diffValue: { cacheKey: row.cache_key },
      evidence: row,
      rootCauseCode: 'CACHE_STALE',
      rootCauseMessage: '数据库更新时间晚于缓存更新时间，前台可能仍返回旧数据。',
      autoFixable: true,
      repairSuggestion: { repairType: 'clear_cache_key', description: '清理对应缓存或等待缓存重建。', cacheKey: row.cache_key },
    })),
  };
}

module.exports = { CACHE_STALE_AFTER_ADMIN_UPDATE: cacheStaleAfterAdminUpdate };
