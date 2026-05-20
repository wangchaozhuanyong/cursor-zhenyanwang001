const { runPendingMigrations, listPendingMigrationNames } = require('./migrateRunner');
const {
  loadSchemaCapabilities,
  invalidateSchemaCapabilitiesCache,
  getPendingCriticalMigrations,
  CRITICAL_ADMIN_MIGRATIONS,
} = require('./schemaContract');

/**
 * 启动前数据库准备：自动迁移 + 预热结构契约
 * @param {{ runMigrations?: boolean }} [options]
 */
async function prepareDatabaseForRuntime(options = {}) {
  const runMigrations = options.runMigrations !== false;
  if (runMigrations) {
    await runPendingMigrations();
    invalidateSchemaCapabilitiesCache();
  }

  const capabilities = await loadSchemaCapabilities();
  const pendingAll = await listPendingMigrationNames();
  const pendingCritical = await getPendingCriticalMigrations();

  if (pendingAll.length > 0) {
    console.warn(
      `[schema] 仍有 ${pendingAll.length} 个迁移未执行；管理端统计/报表可能不准确或报错。`
      + ` 请在 server 目录执行: npm run migrate`,
    );
    if (pendingCritical.length > 0) {
      console.warn(`[schema] 关键迁移未执行: ${pendingCritical.join(', ')}`);
    }
  }

  if (!capabilities.ordersRefundedAmount) {
    console.warn('[schema] orders.refunded_amount 缺失 — 将按订单总额统计营收（未扣退款）。请执行迁移 096_orders_refunded_amount');
  }

  return { capabilities, pendingAll, pendingCritical };
}

module.exports = {
  prepareDatabaseForRuntime,
  CRITICAL_ADMIN_MIGRATIONS,
};
