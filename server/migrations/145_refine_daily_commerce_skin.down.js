module.exports = {
  async down() {
    // No safe automatic rollback: the previous skin may have been edited in the admin panel.
    // Restore site_settings.theme_skins from backup if this visual update must be reverted.
  },
};
