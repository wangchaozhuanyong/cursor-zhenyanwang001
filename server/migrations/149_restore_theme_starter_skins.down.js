module.exports = {
  async down() {
    // No safe automatic rollback: admins may have edited these skins after restore.
    // Restore site_settings.theme_skins from backup if this migration must be reverted.
  },
};
