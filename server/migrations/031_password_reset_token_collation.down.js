module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE password_reset_tokens
      MODIFY token_hash VARCHAR(64) NOT NULL
    `).catch(() => {});
  },
};
