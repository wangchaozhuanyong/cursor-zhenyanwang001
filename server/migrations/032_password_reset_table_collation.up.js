module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE password_reset_tokens
      MODIFY id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `).catch(() => {});
    await query(`
      ALTER TABLE password_reset_tokens
      MODIFY token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL
    `).catch(() => {});
  },
};
