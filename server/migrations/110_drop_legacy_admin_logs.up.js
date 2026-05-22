/**
 * Remove the retired admin_logs audit path.
 *
 * The active operation log is audit_logs. Migration 025 already copied legacy
 * admin_log.view role access to audit.view, so this can safely remove the
 * obsolete permission and table.
 */
module.exports = {
  async up(query) {
    await query(`
      DELETE rp
      FROM role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = 'admin_log.view'
    `);

    await query("DELETE FROM permissions WHERE code = 'admin_log.view'");
    await query('DROP TABLE IF EXISTS admin_logs');
  },
};
