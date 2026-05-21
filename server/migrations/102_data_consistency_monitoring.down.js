module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS cache_meta').catch(() => {});
    await query('DROP TABLE IF EXISTS data_consistency_rule_events').catch(() => {});
    await query('DROP TABLE IF EXISTS data_change_events').catch(() => {});
    await query('DROP TABLE IF EXISTS data_repair_tasks').catch(() => {});
    await query('DROP TABLE IF EXISTS data_consistency_anomalies').catch(() => {});
    await query('DROP TABLE IF EXISTS data_consistency_runs').catch(() => {});
    await query('DROP TABLE IF EXISTS data_consistency_rules').catch(() => {});
    await query(`
      DELETE rp FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code IN ('monitoring.view', 'monitoring.manage', 'monitoring.repair')
    `).catch(() => {});
    await query("DELETE FROM permissions WHERE code IN ('monitoring.view', 'monitoring.manage', 'monitoring.repair')").catch(() => {});
  },
};
