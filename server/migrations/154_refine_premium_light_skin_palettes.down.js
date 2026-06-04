module.exports = {
  async down() {
    // No safe automatic rollback: theme_skins can include custom admin edits.
    // Restore site_settings.theme_skins and site_settings.theme_config from backup if this palette sync must be reverted.
  },
};
