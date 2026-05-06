module.exports = {
  async down(query) {
    await query(
      "DELETE FROM site_settings WHERE setting_key = 'theme_config'",
    ).catch(() => {});
  },
};
