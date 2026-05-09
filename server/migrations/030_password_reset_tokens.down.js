module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS password_reset_tokens');
  },
};
