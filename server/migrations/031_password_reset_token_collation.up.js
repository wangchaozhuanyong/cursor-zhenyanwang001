module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE password_reset_tokens
      MODIFY token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL
    `).catch(() => {});
  },
};
