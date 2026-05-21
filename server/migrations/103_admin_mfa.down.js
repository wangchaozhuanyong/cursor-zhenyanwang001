module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS admin_trusted_devices').catch(() => {});
    await query('DROP TABLE IF EXISTS admin_mfa_settings').catch(() => {});
  },
};
