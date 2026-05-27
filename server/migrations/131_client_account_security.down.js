module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS security_risk_device_blocks').catch(() => {});
    await query('DROP TABLE IF EXISTS security_risk_ip_blocks').catch(() => {});
    await query('DROP TABLE IF EXISTS user_security_events').catch(() => {});
    await query('DROP TABLE IF EXISTS user_login_attempts').catch(() => {});
    await query('DROP TABLE IF EXISTS user_sessions').catch(() => {});
    await query('DROP TABLE IF EXISTS user_devices').catch(() => {});
    await query('ALTER TABLE users DROP KEY idx_users_protected_until').catch(() => {});
    await query('ALTER TABLE users DROP COLUMN protected_reason, DROP COLUMN protected_until').catch(() => {});
  },
};
