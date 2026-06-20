module.exports = {
  async down() {
    // No safe automatic rollback: removed skins may include admin-edited values.
    // Restore site_settings.theme_skins and site_settings.theme_config from backup if needed.
  },
};
