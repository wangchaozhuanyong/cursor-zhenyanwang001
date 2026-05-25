module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS admin_webauthn_credentials').catch(() => {});
    await query('DROP TABLE IF EXISTS admin_sensitive_action_tokens').catch(() => {});
    await query('ALTER TABLE admin_trusted_devices DROP COLUMN last_ip_hash').catch(() => {});
    await query('ALTER TABLE admin_trusted_devices DROP COLUMN trusted_ip_hash').catch(() => {});
    await query('ALTER TABLE admin_trusted_devices DROP COLUMN device_label').catch(() => {});
  },
};
