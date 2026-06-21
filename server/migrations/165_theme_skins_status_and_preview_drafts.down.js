module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS theme_preview_drafts');
    await query('DROP TABLE IF EXISTS theme_skins');
  },
};
