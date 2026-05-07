module.exports = {
  async down(query) {
    await query(`DELETE FROM site_settings WHERE setting_key IN ('theme_skins')`);
  },
};

