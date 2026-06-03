module.exports = {
  async down() {
    // No safe automatic rollback: previous system preset skins may already have been mixed with custom skins.
    // Restore site_settings.theme_skins and site_settings.theme_config from backup if this visual preset sync must be reverted.
  },
};
