module.exports = {
  async up(query) {
    await query(`
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES ('admin_mfa_policy', '{"enabled":true}')
      ON DUPLICATE KEY UPDATE setting_value = setting_value
    `);
  },
};
