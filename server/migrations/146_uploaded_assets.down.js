module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS uploaded_assets');
  },
};
