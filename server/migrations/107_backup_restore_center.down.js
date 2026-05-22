module.exports = {
  async down(query) {
    await query(`DROP TABLE IF EXISTS restore_drill_reports`);
    await query(`DROP TABLE IF EXISTS restore_jobs`);
    await query(`DROP TABLE IF EXISTS binlog_files`);
    await query(`DROP TABLE IF EXISTS backup_alerts`);
    await query(`DROP TABLE IF EXISTS backup_files`);
    await query(`DROP TABLE IF EXISTS backup_jobs`);
    await query(`DROP TABLE IF EXISTS backup_settings`);
    await query(`
      DELETE rp FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code IN ('backup.view','backup.create','backup.restore.request','backup.restore.approve')
    `);
    await query(`DELETE FROM permissions WHERE code IN ('backup.view','backup.create','backup.restore.request','backup.restore.approve')`);
  },
};
