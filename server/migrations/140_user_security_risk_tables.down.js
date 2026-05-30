module.exports = {
  async down(query) {
    const dropIndex = async (table, index) => {
      await query(`ALTER TABLE ${table} DROP INDEX ${index}`).catch((e) => {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      });
    };

    const dropColumn = async (column) => {
      await query(`ALTER TABLE users DROP COLUMN ${column}`).catch((e) => {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      });
    };

    await query('DROP TABLE IF EXISTS user_risk_devices');
    await query('DROP TABLE IF EXISTS user_risk_ips');
    await query('DROP TABLE IF EXISTS user_security_events');

    await dropIndex('user_login_audits', 'idx_login_audit_ua_created');
    await dropIndex('user_login_audits', 'idx_login_audit_ip_created');
    await dropIndex('users', 'idx_users_protected_until');
    await dropColumn('protected_reason');
    await dropColumn('protected_until');
  },
};
