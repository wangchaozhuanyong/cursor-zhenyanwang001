module.exports = {
  async down(query) {
    await query("DELETE FROM site_settings WHERE setting_key = 'home_module_settings'");
  },
};
