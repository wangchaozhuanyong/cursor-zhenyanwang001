module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_password_reset_user (user_id),
        UNIQUE KEY uk_password_reset_token_hash (token_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
