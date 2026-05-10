module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS user_tags (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(20) NOT NULL DEFAULT '金色',
        description VARCHAR(255) NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_tags_name (name),
        KEY idx_user_tags_sort (sort_order, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_tag_assignments (
        user_id VARCHAR(36) NOT NULL,
        tag_id VARCHAR(36) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, tag_id),
        KEY idx_uta_tag (tag_id),
        KEY idx_uta_user_created (user_id, created_at),
        CONSTRAINT fk_uta_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_uta_tag FOREIGN KEY (tag_id) REFERENCES user_tags (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
