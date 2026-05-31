module.exports = {
  async down() {
    // No safe automatic rollback: older custom theme_skins may have been many different records.
    // Restore site_settings.theme_skins from backup if this migration must be reverted.
  },
};
